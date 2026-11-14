<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\LmsPermission;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RecycleBinController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'recycle_bin.manage')) {
            return $this->forbidden('You do not have permission to manage the recycle bin.');
        }
        if ($actor->role === 'branch_manager' && !$this->hasActiveBranch($actor->branch_id)) {
            return $this->forbidden('Your account is not assigned to an active branch.');
        }

        $query = DB::table('recycle_bin_items as items')
            ->leftJoin('users as deleters', 'deleters.id', '=', 'items.deleted_by')
            ->where('items.status', 'active')
            ->select([
                'items.id',
                'items.entity_type',
                'items.entity_id',
                'items.title',
                'items.branch_id',
                'items.status',
                'items.deleted_at',
                'items.expires_at',
                'items.purge_error',
                'deleters.name as deleted_by',
            ]);

        if ($actor->role === 'branch_manager') {
            $query->where('items.branch_id', $actor->branch_id);
        }

        $items = $query->orderByDesc('items.deleted_at')
            ->orderByDesc('items.id')
            ->limit(1000)
            ->get()
            ->map(function (object $item): object {
                $expiresAt = $item->expires_at ? Carbon::parse($item->expires_at) : null;
                $item->deleted_by = $item->deleted_by ?: 'System / previous deletion';
                $item->retention_days_left = $expiresAt
                    ? max(0, (int) now()->startOfDay()->diffInDays($expiresAt->copy()->startOfDay(), false))
                    : null;
                $item->can_restore = $expiresAt !== null && $expiresAt->isFuture();
                $item->can_purge = $expiresAt !== null && !$expiresAt->isFuture();

                return $item;
            });

        return response()->json([
            'success' => true,
            'message' => 'Recycle-bin items loaded.',
            'data' => ['items' => $items],
        ]);
    }

    public function restore(Request $request, int $itemId): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'recycle_bin.manage')) {
            return $this->forbidden('You do not have permission to restore recycle-bin items.');
        }

        $result = DB::transaction(function () use ($request, $actor, $itemId): array|JsonResponse {
            $item = DB::table('recycle_bin_items')
                ->where('id', $itemId)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (!$item) {
                return $this->notFound();
            }
            if (!$this->withinActorScope($actor, $item->branch_id)) {
                return $this->forbidden('This recycle-bin item is outside your assigned branch.');
            }
            if (!$item->expires_at || !Carbon::parse($item->expires_at)->isFuture()) {
                return response()->json([
                    'success' => false,
                    'message' => 'The 30-day retention period has expired; this item can no longer be restored.',
                    'error' => 'Conflict.',
                ], 409);
            }

            $table = $this->entityTable((string) $item->entity_type);
            if ($table === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'This item type is still managed by the legacy recycle-bin workflow.',
                    'error' => 'Unsupported entity type.',
                ], 409);
            }

            $entity = DB::table($table)
                ->where('id', $item->entity_id)
                ->whereNotNull('deleted_at')
                ->lockForUpdate()
                ->first();

            if (!$entity) {
                return response()->json([
                    'success' => false,
                    'message' => 'The original record is unavailable or has already been restored.',
                    'error' => 'Conflict.',
                ], 409);
            }

            if ($actor->role === 'branch_manager'
                && ($item->branch_id === null || (int) $item->branch_id !== (int) $actor->branch_id)) {
                return $this->forbidden('This recycle-bin item is outside your assigned branch.');
            }

            $snapshot = $this->snapshot($item->snapshot);
            DB::table($table)->where('id', $item->entity_id)->update([
                'deleted_at' => null,
                'status' => (string) ($snapshot['status'] ?? 'draft'),
                'updated_at' => now(),
            ]);
            DB::table('recycle_bin_items')->where('id', $itemId)->update([
                'status' => 'restored',
                'restored_by' => (int) $actor->id,
                'restored_at' => now(),
                'purge_error' => null,
            ]);
            $this->audit($request, $actor->id, 'recycle_bin.restored', $item, []);

            return ['id' => $itemId, 'entity_type' => $item->entity_type, 'entity_id' => (int) $item->entity_id];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Item restored.', 'data' => $result]);
    }

    public function permanentlyDelete(Request $request, int $itemId): JsonResponse
    {
        $actor = $request->user();
        if (!LmsPermission::allows($actor, 'recycle_bin.purge')) {
            return $this->forbidden('You do not have permission to permanently delete recycle-bin items.');
        }

        $result = DB::transaction(function () use ($request, $actor, $itemId): array|JsonResponse {
            $item = DB::table('recycle_bin_items')
                ->where('id', $itemId)
                ->where('status', 'active')
                ->lockForUpdate()
                ->first();

            if (!$item) {
                return $this->notFound();
            }
            if (!$this->withinActorScope($actor, $item->branch_id)) {
                return $this->forbidden('This recycle-bin item is outside your assigned branch.');
            }
            if (!$item->expires_at || Carbon::parse($item->expires_at)->isFuture()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Permanent deletion is available only after the 30-day retention period.',
                    'error' => 'Conflict.',
                ], 409);
            }

            $table = $this->entityTable((string) $item->entity_type);
            if ($table === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'This item type is still managed by the legacy recycle-bin workflow.',
                    'error' => 'Unsupported entity type.',
                ], 409);
            }

            $entity = DB::table($table)->where('id', $item->entity_id)->lockForUpdate()->first();
            if (!$entity) {
                $this->markPurged($request, $actor->id, $item);
                return ['id' => $itemId, 'already_absent' => true];
            }

            if ($entity->deleted_at === null) {
                DB::table('recycle_bin_items')->where('id', $itemId)->update([
                    'status' => 'restored',
                    'restored_by' => (int) $actor->id,
                    'restored_at' => now(),
                    'purge_error' => null,
                ]);
                $this->audit($request, $actor->id, 'recycle_bin.restore_reconciled', $item, []);

                return response()->json([
                    'success' => false,
                    'message' => 'The original record has already been restored; its recycle-bin entry was reconciled.',
                    'error' => 'Conflict.',
                ], 409);
            }

            if ($table === 'content_items') {
                $mediaUrl = (string) ($entity->media_url ?? '');
                if ($mediaUrl !== '' && (str_contains($mediaUrl, '/storage/private/') || str_contains($mediaUrl, '/api/media.php'))) {
                    return $this->blockedPurge($itemId, 'Content references a private media file; remove or reassign the media asset before permanent deletion.');
                }
            }

            $blocked = $this->foreignReferenceBlock($table, (int) $item->entity_id);
            if ($blocked !== null) {
                return $this->blockedPurge($itemId, $blocked);
            }

            try {
                $deleted = DB::table($table)
                    ->where('id', $item->entity_id)
                    ->whereNotNull('deleted_at')
                    ->delete();
            } catch (QueryException $exception) {
                if ((string) $exception->getCode() !== '23000') {
                    throw $exception;
                }

                return $this->blockedPurge($itemId, 'Linked records prevent permanent deletion; the original data has been retained.');
            }

            if ($deleted !== 1) {
                return $this->blockedPurge($itemId, 'The original record changed while permanent deletion was being checked.');
            }

            $this->markPurged($request, $actor->id, $item);

            return ['id' => $itemId, 'already_absent' => false];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json(['success' => true, 'message' => 'Item permanently deleted.', 'data' => $result]);
    }

    private function entityTable(string $type): ?string
    {
        return match ($type) {
            'course' => 'courses',
            'content' => 'content_items',
            'batch' => 'batches',
            'exam' => 'exams',
            'cms_post' => 'cms_posts',
            'cms_testimonial' => 'cms_testimonials',
            default => null,
        };
    }

    private function snapshot(mixed $snapshot): array
    {
        if (is_array($snapshot)) {
            return $snapshot;
        }
        if (!is_string($snapshot) || $snapshot === '') {
            return [];
        }

        $decoded = json_decode($snapshot, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function withinActorScope($actor, mixed $branchId): bool
    {
        if ($actor->role !== 'branch_manager') {
            return true;
        }

        return $branchId !== null
            && (int) $branchId === (int) $actor->branch_id
            && $this->hasActiveBranch($actor->branch_id);
    }

    private function hasActiveBranch(mixed $branchId): bool
    {
        return $branchId !== null && DB::table('branches')
            ->where('id', $branchId)
            ->where('is_active', 1)
            ->exists();
    }

    private function foreignReferenceBlock(string $parentTable, int $entityId): ?string
    {
        $driver = DB::getDriverName();
        $references = [];

        if ($driver === 'mysql') {
            $references = DB::select(
                'SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
                 FROM information_schema.KEY_COLUMN_USAGE
                 WHERE CONSTRAINT_SCHEMA = DATABASE()
                   AND REFERENCED_TABLE_SCHEMA = DATABASE()
                   AND REFERENCED_TABLE_NAME = ?
                   AND REFERENCED_COLUMN_NAME = ?',
                [$parentTable, 'id']
            );
        } elseif ($driver === 'sqlite') {
            $tables = DB::select("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
            foreach ($tables as $table) {
                $tableName = (string) $table->name;
                if (!preg_match('/^[A-Za-z0-9_]+$/', $tableName)) {
                    continue;
                }
                foreach (DB::select('PRAGMA foreign_key_list("' . $tableName . '")') as $foreignKey) {
                    if ((string) $foreignKey->table === $parentTable && (string) $foreignKey->to === 'id') {
                        $references[] = (object) ['table_name' => $tableName, 'column_name' => (string) $foreignKey->from];
                    }
                }
            }
        } else {
            return 'The database driver cannot safely inspect linked records; the original data was retained.';
        }

        foreach ($references as $reference) {
            $table = (string) $reference->table_name;
            $column = (string) $reference->column_name;
            if (!preg_match('/^[A-Za-z0-9_]+$/', $table) || !preg_match('/^[A-Za-z0-9_]+$/', $column)) {
                return 'A related database reference could not be safely inspected.';
            }
            if (DB::table($table)->where($column, $entityId)->exists()) {
                return 'Linked ' . str_replace('_', ' ', $table) . ' records remain; historical data is retained.';
            }
        }

        return null;
    }

    private function blockedPurge(int $itemId, string $reason): JsonResponse
    {
        DB::table('recycle_bin_items')->where('id', $itemId)->update(['purge_error' => $reason]);

        return response()->json([
            'success' => false,
            'message' => $reason,
            'error' => 'Conflict.',
        ], 409);
    }

    private function markPurged(Request $request, int $actorId, object $item): void
    {
        DB::table('recycle_bin_items')->where('id', $item->id)->update([
            'status' => 'purged',
            'purged_by' => $actorId,
            'purged_at' => now(),
            'purge_error' => null,
        ]);
        $this->audit($request, $actorId, 'recycle_bin.permanently_deleted', $item, []);
    }

    private function audit(Request $request, int $actorId, string $event, object $item, array $metadata): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $actorId,
            'action' => $event,
            'entity_type' => 'recycle_bin:' . $item->entity_type,
            'entity_id' => (int) $item->entity_id,
            'ip_address' => substr((string) $request->ip(), 0, 45) ?: null,
            'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
        ]);
    }

    private function notFound(): JsonResponse
    {
        return response()->json(['success' => false, 'message' => 'Active recycle-bin item not found.', 'error' => 'Not found.'], 404);
    }

    private function forbidden(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message, 'error' => 'Forbidden.'], 403);
    }
}

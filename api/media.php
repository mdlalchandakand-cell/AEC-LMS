<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? '');

function aec_media_storage_dir(): string
{
    return dirname(__DIR__) . '/storage/private/media';
}

function aec_media_safe_filename(string $name): string
{
    $name = basename(str_replace('\\', '/', $name));
    $name = preg_replace('/[^A-Za-z0-9._ -]/u', '_', $name) ?? 'upload';
    $name = trim($name, ". _");
    return mb_substr($name !== '' ? $name : 'upload', 0, 255);
}

function aec_media_can_download(PDO $db, array $asset, array $actor): bool
{
    if ($actor['role'] === 'super_admin') return true;
    $permission = $db->prepare("SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'content.manage' LIMIT 1");
    $permission->execute([$actor['role']]);
    if ((bool)$permission->fetchColumn()) return true;

    $stmt = $db->prepare(
        "SELECT 1 FROM course_content cc
         INNER JOIN content_items ci ON ci.id = cc.content_item_id
         INNER JOIN course_enrollments ce ON ce.course_id = cc.course_id
         INNER JOIN courses c ON c.id = cc.course_id
         WHERE cc.content_item_id = ? AND ce.user_id = ?
           AND ce.status IN ('active','completed')
           AND ci.deleted_at IS NULL AND ci.status = 'published'
           AND c.deleted_at IS NULL AND c.status = 'published'
           AND (c.branch_id IS NULL OR EXISTS (
             SELECT 1 FROM branches b WHERE b.id = c.branch_id AND b.is_active = 1
           ))
         LIMIT 1"
    );
    $stmt->execute([(int)$asset['content_item_id'], (int)$actor['id']]);
    return (bool)$stmt->fetchColumn();
}

if ($action === 'list') {
    aec_method(['GET']);
    aec_require_permission('content.manage');
    $contentId = filter_input(INPUT_GET, 'content_id', FILTER_VALIDATE_INT);
    $sql = 'SELECT id, content_item_id, original_filename, mime_type, size_bytes, sha256, uploaded_at FROM media_assets';
    if ($contentId) {
        $sql .= ' WHERE content_item_id = ?';
        $stmt = $db->prepare($sql . ' ORDER BY uploaded_at DESC, id DESC');
        $stmt->execute([$contentId]);
    } else {
        $stmt = $db->query($sql . ' ORDER BY uploaded_at DESC, id DESC LIMIT 500');
    }
    aec_ok($stmt->fetchAll());
}

if ($action === 'upload') {
    aec_method(['POST']);
    $actor = aec_require_permission('content.manage');
    aec_csrf_check();
    $contentId = filter_var($_POST['content_item_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$contentId || $contentId < 1) aec_fail('A valid content item is required before uploading a file.', 422);
    $content = $db->prepare('SELECT id FROM content_items WHERE id = ? AND deleted_at IS NULL');
    $content->execute([$contentId]);
    if (!$content->fetchColumn()) aec_fail('Content item not found.', 404);

    $file = $_FILES['file'] ?? null;
    if (!is_array($file) || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) aec_fail('Select a file to upload.', 422);
    $size = (int)($file['size'] ?? 0);
    if ($size < 1 || $size > 20971520) aec_fail('File size must be between 1 byte and 20 MB.', 413);
    $tmp = (string)($file['tmp_name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) aec_fail('Uploaded file could not be verified.', 422);

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmp);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'application/pdf' => 'pdf',
        'audio/mpeg' => 'mp3',
        'audio/mp4' => 'm4a',
        'audio/ogg' => 'ogg',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
    ];
    if (!is_string($mime) || !isset($allowed[$mime])) aec_fail('This file type is not allowed. Upload an image, PDF, MP3, M4A, OGG, MP4 or WebM file.', 415);

    $directory = aec_media_storage_dir();
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) aec_fail('Private media storage is unavailable.', 500);
    $storageName = bin2hex(random_bytes(32));
    $destination = $directory . '/' . $storageName;
    if (!move_uploaded_file($tmp, $destination)) aec_fail('Could not save the uploaded file.', 500);
    chmod($destination, 0640);

    try {
        $stmt = $db->prepare(
            'INSERT INTO media_assets (content_item_id, original_filename, storage_filename, mime_type, size_bytes, sha256, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $contentId,
            aec_media_safe_filename((string)($file['name'] ?? 'upload.' . $allowed[$mime])),
            $storageName,
            $mime,
            $size,
            hash_file('sha256', $destination),
            (int)$actor['id'],
        ]);
        $id = (int)$db->lastInsertId();
    } catch (Throwable $error) {
        @unlink($destination);
        throw $error;
    }
    aec_ok(['id' => $id, 'content_item_id' => $contentId, 'filename' => aec_media_safe_filename((string)($file['name'] ?? 'upload')), 'mime_type' => $mime, 'size_bytes' => $size, 'download_url' => '/api/media.php?action=download&id=' . $id], 'Media uploaded to private storage.', 201);
}

if ($action === 'download') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid media identifier is required.', 422);
    $stmt = $db->prepare('SELECT * FROM media_assets WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $asset = $stmt->fetch();
    if (!$asset || !aec_media_can_download($db, $asset, $actor)) aec_fail('Media file not found.', 404);
    $path = aec_media_storage_dir() . '/' . $asset['storage_filename'];
    if (!is_file($path) || !is_readable($path)) aec_fail('Media file is unavailable.', 404);
    $size = (int)$asset['size_bytes'];
    $start = 0;
    $end = $size - 1;
    $status = 200;
    $range = (string)($_SERVER['HTTP_RANGE'] ?? '');
    if ($range !== '') {
        if (!preg_match('/^bytes=(\d*)-(\d*)$/', $range, $matches) || ($matches[1] === '' && $matches[2] === '')) {
            header('Content-Range: bytes */' . $size);
            aec_fail('Invalid byte range.', 416);
        }
        if ($matches[1] === '') {
            $suffixLength = (int)$matches[2];
            $start = max(0, $size - $suffixLength);
        } else {
            $start = (int)$matches[1];
            if ($matches[2] !== '') $end = min($size - 1, (int)$matches[2]);
        }
        if ($start > $end || $start >= $size) {
            header('Content-Range: bytes */' . $size);
            aec_fail('Requested byte range is not satisfiable.', 416);
        }
        $status = 206;
    }
    $inline = str_starts_with((string)$asset['mime_type'], 'image/')
        || str_starts_with((string)$asset['mime_type'], 'audio/')
        || str_starts_with((string)$asset['mime_type'], 'video/');
    http_response_code($status);
    header('Content-Type: ' . $asset['mime_type']);
    header('Accept-Ranges: bytes');
    header('Content-Length: ' . (string)($end - $start + 1));
    if ($status === 206) header("Content-Range: bytes {$start}-{$end}/{$size}");
    header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . $asset['original_filename'] . '"');
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    $handle = fopen($path, 'rb');
    if ($handle === false) aec_fail('Media file is unavailable.', 404);
    fseek($handle, $start);
    $remaining = $end - $start + 1;
    while ($remaining > 0 && !feof($handle)) {
        $chunk = fread($handle, min(8192, $remaining));
        if ($chunk === false || $chunk === '') break;
        echo $chunk;
        $remaining -= strlen($chunk);
    }
    fclose($handle);
    exit;
}

if ($action === 'delete') {
    aec_method(['POST']);
    aec_require_permission('content.manage');
    aec_csrf_check();
    $input = aec_input();
    $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid media identifier is required.', 422);
    $stmt = $db->prepare('SELECT storage_filename FROM media_assets WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $asset = $stmt->fetch();
    if (!$asset) aec_fail('Media file not found.', 404);
    $db->prepare('DELETE FROM media_assets WHERE id = ?')->execute([$id]);
    $path = aec_media_storage_dir() . '/' . $asset['storage_filename'];
    if (is_file($path)) @unlink($path);
    aec_ok(null, 'Media file deleted.');
}

aec_fail('Unknown media action.', 404);

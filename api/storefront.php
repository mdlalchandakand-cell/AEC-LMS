<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = (string)($_GET['action'] ?? '');

function aec_storefront_settings(PDO $db): array
{
    $stmt = $db->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'website' LIMIT 1");
    $stmt->execute();
    $value = $stmt->fetchColumn();
    $decoded = $value ? json_decode((string)$value, true) : [];
    return is_array($decoded) ? $decoded : [];
}

function aec_storefront_item(array $items, string $id): ?array
{
    foreach ($items as $item) {
        if (is_array($item) && (string)($item['id'] ?? '') === $id) return $item;
    }
    return null;
}

function aec_storefront_phone(string $phone): bool
{
    return preg_match('/^01[3-9][0-9]{8}$/', $phone) === 1;
}

function aec_storefront_audit(PDO $db, int $actorId, string $action, string $entity, int $entityId, array $metadata = []): void
{
    $stmt = $db->prepare('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $actorId, $action, $entity, $entityId,
        substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null,
        json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
    ]);
}

if ($action === 'my_ebooks') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $stmt = $db->prepare("SELECT ebook_id FROM ebook_orders WHERE user_id = ? AND status = 'verified' GROUP BY ebook_id ORDER BY ebook_id");
    $stmt->execute([(int)$actor['id']]);
    $orders = $db->prepare('SELECT id, ebook_id, ebook_title, amount, payment_method, trx_id, status, rejection_reason, created_at, verified_at FROM ebook_orders WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100');
    $orders->execute([(int)$actor['id']]);
    $files = $db->query('SELECT ebook_id FROM ebook_files')->fetchAll(PDO::FETCH_COLUMN);
    aec_ok([
        'ebook_ids' => array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN)),
        'available_file_ids' => array_map('strval', $files),
        'orders' => $orders->fetchAll(),
    ]);
}

if ($action === 'ebook_files') {
    aec_method(['GET']);
    aec_require_permission('cms.manage');
    aec_ok($db->query('SELECT ebook_id, original_filename, mime_type, size_bytes, sha256, uploaded_at FROM ebook_files ORDER BY uploaded_at DESC')->fetchAll());
}

if ($action === 'ebook_upload') {
    aec_method(['POST']);
    $actor = aec_require_permission('cms.manage');
    aec_csrf_check();
    $ebookId = trim((string)($_POST['ebook_id'] ?? ''));
    if ($ebookId === '' || strlen($ebookId) > 80) aec_fail('A valid e-book id is required.', 422);
    $file = $_FILES['pdf'] ?? null;
    if (!is_array($file) || (int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) aec_fail('Select a PDF file to upload.', 422);
    $size = (int)($file['size'] ?? 0);
    if ($size < 1 || $size > 20971520) aec_fail('PDF file size must be between 1 byte and 20 MB.', 413);
    $tmpPath = (string)($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) aec_fail('Uploaded file could not be verified.', 422);
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmpPath);
    $handle = fopen($tmpPath, 'rb');
    $signature = $handle ? fread($handle, 5) : '';
    if ($handle) fclose($handle);
    if ($mime !== 'application/pdf' || $signature !== '%PDF-') aec_fail('Only valid PDF documents are accepted.', 415);

    $settings = aec_storefront_settings($db);
    $book = aec_storefront_item(is_array($settings['ebooks'] ?? null) ? $settings['ebooks'] : [], $ebookId);
    if (!$book) aec_fail('E-book was not found in the saved CMS catalog. Save the catalog item before uploading its PDF.', 404);
    $directory = dirname(__DIR__) . '/storage/private/ebooks';
    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) aec_fail('Private e-book storage is unavailable.', 500);
    $storageFilename = bin2hex(random_bytes(24)) . '.pdf';
    $destination = $directory . DIRECTORY_SEPARATOR . $storageFilename;
    if (!move_uploaded_file($tmpPath, $destination)) aec_fail('Could not store the uploaded PDF.', 500);
    chmod($destination, 0640);
    $sha256 = hash_file('sha256', $destination) ?: '';
    $originalFilename = basename((string)($file['name'] ?? 'ebook.pdf'));
    $originalFilename = preg_replace('/[\x00-\x1F\x7F\\\/]+/u', '_', $originalFilename) ?: 'ebook.pdf';
    $originalFilename = mb_substr($originalFilename, 0, 255);

    $db->beginTransaction();
    try {
        $existing = $db->prepare('SELECT storage_filename FROM ebook_files WHERE ebook_id = ? LIMIT 1 FOR UPDATE');
        $existing->execute([$ebookId]);
        $oldFilename = $existing->fetchColumn();
        $save = $db->prepare('INSERT INTO ebook_files (ebook_id, original_filename, storage_filename, mime_type, size_bytes, sha256, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE original_filename = VALUES(original_filename), storage_filename = VALUES(storage_filename), mime_type = VALUES(mime_type), size_bytes = VALUES(size_bytes), sha256 = VALUES(sha256), uploaded_by = VALUES(uploaded_by), uploaded_at = NOW()');
        $save->execute([$ebookId, $originalFilename, $storageFilename, 'application/pdf', $size, $sha256, (int)$actor['id']]);
        $fileIdStmt = $db->prepare('SELECT id FROM ebook_files WHERE ebook_id = ? LIMIT 1');
        $fileIdStmt->execute([$ebookId]);
        $fileId = (int)$fileIdStmt->fetchColumn();
        aec_storefront_audit($db, (int)$actor['id'], 'ebook.file_uploaded', 'ebook_file', $fileId, ['ebook_id' => $ebookId, 'size_bytes' => $size, 'sha256' => $sha256]);
        $db->commit();
        if (is_string($oldFilename) && $oldFilename !== '' && $oldFilename !== $storageFilename) {
            $oldPath = $directory . DIRECTORY_SEPARATOR . basename($oldFilename);
            if (is_file($oldPath)) @unlink($oldPath);
        }
        aec_ok(['ebook_id' => $ebookId, 'original_filename' => $originalFilename, 'size_bytes' => $size, 'sha256' => $sha256], 'Private e-book PDF uploaded.', 201);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        if (is_file($destination)) @unlink($destination);
        throw $error;
    }
}

if ($action === 'ebook_download') {
    aec_method(['GET']);
    $actor = aec_current_user();
    $ebookId = trim((string)($_GET['id'] ?? ''));
    if ($ebookId === '' || strlen($ebookId) > 80) aec_fail('A valid e-book id is required.', 422);
    $settings = aec_storefront_settings($db);
    $book = aec_storefront_item(is_array($settings['ebooks'] ?? null) ? $settings['ebooks'] : [], $ebookId);
    if (!$book) aec_fail('E-book not found.', 404);
    $isAdmin = in_array((string)($actor['role'] ?? ''), ['admin','super_admin'], true);
    $isFree = !empty($book['isFree']);
    if (!$isAdmin && !$isFree) {
        $entitlement = $db->prepare("SELECT id FROM ebook_orders WHERE user_id = ? AND ebook_id = ? AND status = 'verified' LIMIT 1");
        $entitlement->execute([(int)$actor['id'], $ebookId]);
        if (!$entitlement->fetchColumn()) aec_fail('Verified purchase is required to download this e-book.', 403);
    }
    if (!$isAdmin && $isFree && array_key_exists('isActive', $book) && !$book['isActive']) aec_fail('This e-book is no longer available.', 404);
    $fileStmt = $db->prepare('SELECT original_filename, storage_filename, size_bytes, sha256 FROM ebook_files WHERE ebook_id = ? LIMIT 1');
    $fileStmt->execute([$ebookId]);
    $file = $fileStmt->fetch();
    if (!$file) aec_fail('The PDF file has not been uploaded yet.', 404);
    $directory = realpath(dirname(__DIR__) . '/storage/private/ebooks');
    $storageFilename = (string)$file['storage_filename'];
    if (!$directory || !preg_match('/^[a-f0-9]{48}\.pdf$/', $storageFilename)) aec_fail('Stored PDF path is invalid.', 500);
    $path = realpath($directory . DIRECTORY_SEPARATOR . $storageFilename);
    if (!$path || !str_starts_with($path, $directory . DIRECTORY_SEPARATOR) || !is_file($path)) aec_fail('Stored PDF file is missing.', 404);
    $size = filesize($path);
    $actualHash = hash_file('sha256', $path);
    if ($size === false || $size !== (int)$file['size_bytes'] || $size > 20971520 || !is_string($actualHash) || !hash_equals((string)$file['sha256'], $actualHash)) {
        aec_fail('Stored PDF file failed integrity checks.', 500);
    }
    $downloadName = preg_replace('/[^A-Za-z0-9._-]+/', '_', pathinfo((string)$file['original_filename'], PATHINFO_FILENAME)) ?: 'ebook';
    session_write_close();
    header('Content-Type: application/pdf');
    header('Content-Length: ' . $size);
    header('Content-Disposition: attachment; filename="' . $downloadName . '.pdf"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, no-store, max-age=0');
    header('Pragma: no-cache');
    readfile($path);
    exit;
}

if ($action === 'ebook_submit') {
    aec_method(['POST']);
    $actor = aec_current_user();
    aec_csrf_check();
    $input = aec_input();
    $ebookId = trim((string)($input['ebook_id'] ?? ''));
    $method = (string)($input['payment_method'] ?? '');
    $trxId = strtoupper(trim((string)($input['trx_id'] ?? '')));
    $phone = preg_replace('/\s+/', '', trim((string)($input['sender_phone'] ?? '')));
    if ($ebookId === '' || strlen($ebookId) > 80) aec_fail('A valid e-book is required.', 422);
    if (!in_array($method, ['bKash', 'Nagad'], true)) aec_fail('Select bKash or Nagad.', 422);
    if (!preg_match('/^[A-Z0-9-]{4,100}$/', $trxId)) aec_fail('Enter a valid transaction reference.', 422);
    if (!aec_storefront_phone($phone)) aec_fail('Enter a valid Bangladesh mobile number.', 422);

    $settings = aec_storefront_settings($db);
    $receiverNumber = trim((string)($settings[$method === 'bKash' ? 'bkashNumber' : 'nagadNumber'] ?? ''));
    $receiverDigits = preg_replace('/\D+/', '', $receiverNumber) ?? '';
    if ($receiverDigits === '' || in_array($receiverDigits, ['01712345678', '01812345678'], true)) {
        aec_fail('The selected payment destination has not been configured by the administrator.', 409);
    }
    $book = aec_storefront_item(is_array($settings['ebooks'] ?? null) ? $settings['ebooks'] : [], $ebookId);
    if (!$book || !empty($book['isFree']) || (array_key_exists('isActive', $book) && !$book['isActive'])) aec_fail('This premium e-book is not available for purchase.', 404);
    $price = filter_var($book['price'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($price === false || $price <= 0 || $price > 1000000) aec_fail('This e-book price is not configured correctly. Contact the administrator.', 409);
    $title = trim((string)($book['title'] ?? ''));
    if ($title === '' || mb_strlen($title) > 180) aec_fail('This e-book title is invalid.', 409);

    $db->beginTransaction();
    try {
        $verified = $db->prepare("SELECT id FROM ebook_orders WHERE user_id = ? AND ebook_id = ? AND status = 'verified' LIMIT 1 FOR UPDATE");
        $verified->execute([(int)$actor['id'], $ebookId]);
        if ($verified->fetchColumn()) aec_fail('You already have access to this e-book.', 409);
        $pending = $db->prepare("SELECT id FROM ebook_orders WHERE user_id = ? AND ebook_id = ? AND status = 'pending' LIMIT 1 FOR UPDATE");
        $pending->execute([(int)$actor['id'], $ebookId]);
        if ($pending->fetchColumn()) aec_fail('A payment request for this e-book is already awaiting verification.', 409);
        $insert = $db->prepare("INSERT INTO ebook_orders (user_id, ebook_id, ebook_title, amount, payment_method, trx_id, sender_phone) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $insert->execute([(int)$actor['id'], $ebookId, $title, number_format((float)$price, 2, '.', ''), $method, $trxId, $phone]);
        $id = (int)$db->lastInsertId();
        aec_storefront_audit($db, (int)$actor['id'], 'ebook.payment_submitted', 'ebook_order', $id, ['ebook_id' => $ebookId, 'amount' => number_format((float)$price, 2, '.', ''), 'payment_method' => $method]);
        $db->commit();
        aec_ok(['id' => $id, 'status' => 'pending', 'amount' => number_format((float)$price, 2, '.', '')], 'Payment request submitted. Access will be granted after staff verification.', 201);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        if ($error instanceof PDOException && (string)$error->getCode() === '23000') aec_fail('This transaction reference has already been submitted.', 409);
        throw $error;
    }
}

if ($action === 'ebook_orders') {
    aec_method(['GET']);
    aec_require_permission('storefront.orders.manage');
    $status = (string)($_GET['status'] ?? '');
    if ($status !== '' && !in_array($status, ['pending', 'verified', 'rejected'], true)) aec_fail('Invalid order status filter.', 422);
    $sql = 'SELECT o.id, o.user_id, u.name AS customer_name, u.email, o.ebook_id, o.ebook_title, o.amount, o.payment_method, o.trx_id, o.sender_phone, o.status, o.rejection_reason, o.created_at, o.verified_at FROM ebook_orders o INNER JOIN users u ON u.id = o.user_id';
    if ($status !== '') $sql .= ' WHERE o.status = ' . $db->quote($status);
    $sql .= ' ORDER BY o.created_at DESC, o.id DESC LIMIT 200';
    aec_ok($db->query($sql)->fetchAll());
}

if ($action === 'ebook_verify' || $action === 'ebook_reject') {
    aec_method(['POST']);
    $actor = aec_require_permission('storefront.orders.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid e-book order id is required.', 422);
    $input = aec_input();
    $reason = trim((string)($input['reason'] ?? ''));
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('SELECT id, user_id, ebook_id, status FROM ebook_orders WHERE id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$id]);
        $order = $stmt->fetch();
        if (!$order) aec_fail('E-book order not found.', 404);
        if ($order['status'] !== 'pending') aec_fail('Only pending e-book orders can be reviewed.', 409);
        if ($action === 'ebook_verify') {
            $existing = $db->prepare("SELECT id FROM ebook_orders WHERE user_id = ? AND ebook_id = ? AND status = 'verified' LIMIT 1");
            $existing->execute([(int)$order['user_id'], (string)$order['ebook_id']]);
            if ($existing->fetchColumn()) aec_fail('The student already has a verified purchase for this e-book.', 409);
            $db->prepare("UPDATE ebook_orders SET status = 'verified', verified_by = ?, verified_at = NOW(), updated_at = NOW() WHERE id = ?")
                ->execute([(int)$actor['id'], $id]);
        } else {
            if ($reason === '' || mb_strlen($reason) > 500) aec_fail('A rejection reason is required (maximum 500 characters).', 422);
            $db->prepare("UPDATE ebook_orders SET status = 'rejected', verified_by = ?, verified_at = NOW(), rejection_reason = ?, updated_at = NOW() WHERE id = ?")
                ->execute([(int)$actor['id'], $reason, $id]);
        }
        aec_storefront_audit($db, (int)$actor['id'], $action, 'ebook_order', (int)$id, ['user_id' => (int)$order['user_id'], 'ebook_id' => (string)$order['ebook_id']]);
        $db->commit();
        aec_ok(['id' => (int)$id, 'status' => $action === 'ebook_verify' ? 'verified' : 'rejected'], 'E-book order reviewed.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'product_submit') {
    aec_method(['POST']);
    $actor = aec_current_user();
    aec_csrf_check();
    $input = aec_input();
    $productId = trim((string)($input['product_id'] ?? ''));
    $quantity = filter_var($input['quantity'] ?? 1, FILTER_VALIDATE_INT);
    $customerName = trim((string)($input['customer_name'] ?? ''));
    $phone = preg_replace('/\s+/', '', trim((string)($input['customer_phone'] ?? '')));
    $address = trim((string)($input['delivery_address'] ?? ''));
    if ($productId === '' || strlen($productId) > 80) aec_fail('A valid product is required.', 422);
    if ($quantity === false || $quantity < 1 || $quantity > 10) aec_fail('Quantity must be between 1 and 10.', 422);
    if ($customerName === '' || mb_strlen($customerName) > 180) aec_fail('Customer name is required.', 422);
    if (!aec_storefront_phone($phone)) aec_fail('Enter a valid Bangladesh mobile number.', 422);
    if ($address === '' || mb_strlen($address) > 1000) aec_fail('Delivery address is required.', 422);

    $settings = aec_storefront_settings($db);
    $product = aec_storefront_item(is_array($settings['products'] ?? null) ? $settings['products'] : [], $productId);
    if (!$product || empty($product['inStock']) || (array_key_exists('isActive', $product) && !$product['isActive'])) aec_fail('This product is not available for ordering.', 404);
    $price = filter_var($product['price'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($price === false || $price <= 0 || $price > 1000000) aec_fail('This product price is not configured correctly. Contact the administrator.', 409);
    $title = trim((string)($product['title'] ?? ''));
    if ($title === '' || mb_strlen($title) > 180) aec_fail('This product title is invalid.', 409);
    $total = round((float)$price * (int)$quantity, 2);

    $db->beginTransaction();
    try {
        $insert = $db->prepare("INSERT INTO product_orders (user_id, product_id, product_title, quantity, unit_price, total_amount, customer_name, customer_phone, delivery_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insert->execute([(int)$actor['id'], $productId, $title, (int)$quantity, number_format((float)$price, 2, '.', ''), number_format($total, 2, '.', ''), $customerName, $phone, $address]);
        $id = (int)$db->lastInsertId();
        aec_storefront_audit($db, (int)$actor['id'], 'product.order_submitted', 'product_order', $id, ['product_id' => $productId, 'quantity' => (int)$quantity, 'total_amount' => number_format($total, 2, '.', '')]);
        $db->commit();
        aec_ok(['id' => $id, 'status' => 'pending', 'total_amount' => number_format($total, 2, '.', '')], 'Cash-on-delivery order submitted.', 201);
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

if ($action === 'product_orders') {
    aec_method(['GET']);
    aec_require_permission('storefront.orders.manage');
    $status = (string)($_GET['status'] ?? '');
    if ($status !== '' && !in_array($status, ['pending','confirmed','processing','shipped','delivered','cancelled'], true)) aec_fail('Invalid order status filter.', 422);
    $sql = 'SELECT o.id, o.user_id, u.name AS account_name, o.product_id, o.product_title, o.quantity, o.unit_price, o.total_amount, o.customer_name, o.customer_phone, o.delivery_address, o.status, o.created_at, o.updated_at FROM product_orders o INNER JOIN users u ON u.id = o.user_id';
    if ($status !== '') $sql .= ' WHERE o.status = ' . $db->quote($status);
    $sql .= ' ORDER BY o.created_at DESC, o.id DESC LIMIT 200';
    aec_ok($db->query($sql)->fetchAll());
}

if ($action === 'product_update') {
    aec_method(['POST']);
    $actor = aec_require_permission('storefront.orders.manage');
    aec_csrf_check();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) aec_fail('A valid product order id is required.', 422);
    $input = aec_input();
    $status = (string)($input['status'] ?? '');
    if (!in_array($status, ['confirmed','processing','shipped','delivered','cancelled'], true)) aec_fail('Invalid product order status.', 422);
    $transitions = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['processing', 'cancelled'],
        'processing' => ['shipped', 'cancelled'],
        'shipped' => ['delivered'],
        'delivered' => [],
        'cancelled' => [],
    ];
    $db->beginTransaction();
    try {
        $currentStmt = $db->prepare('SELECT status FROM product_orders WHERE id = ? LIMIT 1 FOR UPDATE');
        $currentStmt->execute([$id]);
        $currentStatus = $currentStmt->fetchColumn();
        if (!is_string($currentStatus)) aec_fail('Product order not found.', 404);
        if (!in_array($status, $transitions[$currentStatus] ?? [], true)) {
            aec_fail("Product order cannot transition from {$currentStatus} to {$status}.", 409);
        }
        $db->prepare('UPDATE product_orders SET status = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?')
            ->execute([$status, (int)$actor['id'], $id]);
        aec_storefront_audit($db, (int)$actor['id'], 'product.order_updated', 'product_order', (int)$id, ['from' => $currentStatus, 'to' => $status]);
        $db->commit();
        aec_ok(['id' => (int)$id, 'status' => $status], 'Product order updated.');
    } catch (Throwable $error) {
        if ($db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

aec_fail('Unknown storefront action.', 404);

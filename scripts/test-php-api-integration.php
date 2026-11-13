<?php
declare(strict_types=1);

/**
 * End-to-end HTTP integration checks for the PHP API.
 * Runs only against a disposable test database and a local PHP built-in server.
 */

$root = dirname(__DIR__);
$host = getenv('AEC_TEST_DB_HOST') ?: '127.0.0.1';
$port = getenv('AEC_TEST_DB_PORT') ?: '3306';
$name = getenv('AEC_TEST_DB_NAME') ?: 'aec_test';
$user = getenv('AEC_TEST_DB_USER') ?: 'root';
$pass = getenv('AEC_TEST_DB_PASS') ?: '';
$dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
$db = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

 // Migration rerun validation deliberately changes this permission to verify preservation.
 // Restore the isolated admin permission fixture before exercising protected endpoints.
$db->prepare("UPDATE role_permissions SET allowed = 1 WHERE role = 'admin' AND permission_key = 'courses.manage'")->execute();

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function expect_status(array $response, int $status, string $label): array
{
    check($response['status'] === $status, "{$label}: expected HTTP {$status}, got {$response['status']}; body=" . json_encode($response['body']));
    echo "PASS {$label} (HTTP {$status})" . PHP_EOL;
    return $response['body'];
}

/** @return array{status:int,body:array,headers:array} */
function expect_raw_status(array $response, int $status, string $label): void
{
    if (($response['status'] ?? 0) !== $status) {
        throw new RuntimeException("{$label}: expected HTTP {$status}, got " . (int)($response['status'] ?? 0));
    }
    echo "PASS {$label}" . PHP_EOL;
}


function api_upload_request(string $base, int $contentId, string $filename, string $mime, string $contents, ?string &$cookie, ?string $csrf): array
{
    $boundary = '----AEC' . bin2hex(random_bytes(12));
    $body = '';
    $body .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"content_item_id\"\r\n\r\n{$contentId}\r\n";
    $body .= "--{$boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" . addslashes($filename) . "\"\r\n";
    $body .= "Content-Type: {$mime}\r\n\r\n{$contents}\r\n";
    $body .= "--{$boundary}--\r\n";
    $headers = [
        'Accept: application/json',
        "Content-Type: multipart/form-data; boundary={$boundary}",
        'Content-Length: ' . strlen($body),
    ];
    if ($cookie !== null && $cookie !== '') $headers[] = 'Cookie: ' . $cookie;
    if ($csrf !== null) $headers[] = 'X-CSRF-Token: ' . $csrf;
    $context = stream_context_create(['http' => [
        'method' => 'POST', 'header' => implode("\r\n", $headers),
        'content' => $body, 'ignore_errors' => true, 'timeout' => 10,
    ]]);
    $raw = file_get_contents($base . '/api/media.php?action=upload', false, $context);
    $responseHeaders = $http_response_header ?? [];
    $status = 0;
    foreach ($responseHeaders as $header) {
        if (preg_match('/^HTTP\\/\\S+\\s+(\\d{3})/', $header, $match)) $status = (int)$match[1];
        if (stripos($header, 'Set-Cookie: AEC_LMS_SESSION=') === 0) {
            $cookie = trim(explode(';', substr($header, strlen('Set-Cookie:')), 2)[0]);
        }
    }
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return ['status' => $status, 'body' => is_array($decoded) ? $decoded : [], 'headers' => $responseHeaders];
}

function api_request(string $base, string $path, string $method = 'GET', ?array $payload = null, ?string &$cookie = null, ?string $csrf = null, array $extraHeaders = []): array
{
    $headers = ['Accept: application/json'];
    if ($payload !== null) $headers[] = 'Content-Type: application/json';
    if ($cookie !== null && $cookie !== '') $headers[] = 'Cookie: ' . $cookie;
    if ($csrf !== null) $headers[] = 'X-CSRF-Token: ' . $csrf;
    foreach ($extraHeaders as $header) $headers[] = $header;
    $options = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'content' => $payload === null ? '' : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ];
    $context = stream_context_create($options);
    $raw = file_get_contents($base . $path, false, $context);
    $responseHeaders = $http_response_header ?? [];
    $status = 0;
    foreach ($responseHeaders as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) $status = (int)$match[1];
        if (stripos($header, 'Set-Cookie: AEC_LMS_SESSION=') === 0) {
            $cookie = trim(explode(';', substr($header, strlen('Set-Cookie:')), 2)[0]);
        }
    }
    $body = is_string($raw) ? json_decode($raw, true) : null;
    return ['status' => $status, 'body' => is_array($body) ? $body : [], 'headers' => $responseHeaders];
}

/** @return array{status:int,body:array,headers:array} */
function api_upload_pdf(string $base, string $path, string $ebookId, string $filePath, ?string &$cookie = null, ?string $csrf = null): array
{
    $boundary = '----AECUpload' . bin2hex(random_bytes(12));
    $pdf = file_get_contents($filePath);
    if (!is_string($pdf)) throw new RuntimeException('Could not read test PDF fixture.');
    $body = "--{$boundary}\r\n"
        . "Content-Disposition: form-data; name=\"ebook_id\"\r\n\r\n{$ebookId}\r\n"
        . "--{$boundary}\r\n"
        . "Content-Disposition: form-data; name=\"pdf\"; filename=\"integration-test.pdf\"\r\n"
        . "Content-Type: application/pdf\r\n\r\n{$pdf}\r\n"
        . "--{$boundary}--\r\n";
    $headers = ['Accept: application/json', 'Content-Type: multipart/form-data; boundary=' . $boundary];
    if ($cookie !== null && $cookie !== '') $headers[] = 'Cookie: ' . $cookie;
    if ($csrf !== null) $headers[] = 'X-CSRF-Token: ' . $csrf;
    $context = stream_context_create(['http' => [
        'method' => 'POST', 'header' => implode("\r\n", $headers), 'content' => $body,
        'ignore_errors' => true, 'timeout' => 15,
    ]]);
    $raw = file_get_contents($base . $path, false, $context);
    $responseHeaders = $http_response_header ?? [];
    $status = 0;
    foreach ($responseHeaders as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) $status = (int)$match[1];
        if (stripos($header, 'Set-Cookie: AEC_LMS_SESSION=') === 0) {
            $cookie = trim(explode(';', substr($header, strlen('Set-Cookie:')), 2)[0]);
        }
    }
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return ['status' => $status, 'body' => is_array($decoded) ? $decoded : [], 'headers' => $responseHeaders];
}

/** @return array{status:int,body:string,headers:array} */
function api_download_pdf(string $base, string $path, ?string $cookie = null): array
{
    $headers = ['Accept: application/pdf'];
    if ($cookie !== null && $cookie !== '') $headers[] = 'Cookie: ' . $cookie;
    $context = stream_context_create(['http' => [
        'method' => 'GET', 'header' => implode("\r\n", $headers),
        'ignore_errors' => true, 'timeout' => 15,
    ]]);
    $body = file_get_contents($base . $path, false, $context);
    $responseHeaders = $http_response_header ?? [];
    $status = 0;
    foreach ($responseHeaders as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $match)) $status = (int)$match[1];
    }
    return ['status' => $status, 'body' => is_string($body) ? $body : '', 'headers' => $responseHeaders];
}

$socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
check($socket !== false, 'Could not reserve a local port: ' . $error);
$address = stream_socket_get_name($socket, false);
fclose($socket);
$portNumber = (int)substr(strrchr((string)$address, ':'), 1);
$base = "http://127.0.0.1:{$portNumber}";
$descriptors = [0 => ['pipe', 'r'], 1 => ['file', '/dev/null', 'a'], 2 => ['file', '/dev/null', 'a']];
$server = proc_open([PHP_BINARY, '-S', "127.0.0.1:{$portNumber}", '-t', $root], $descriptors, $pipes, $root);
check(is_resource($server), 'Could not start PHP built-in server.');

$cookie = null;
$csrf = null;
$adminId = null;
$accountantId = null;
$studentId = null;
$guardianId = null;
$guardianOtherBranchId = null;
$guardianOtherBranchStudentId = null;
$guardianOtherBranchStudentEmail = null;
$branchManagerId = null;
$branchId = null;
$branchManagedStudentId = null;
$branchManagedCourseId = null;
$otherBranchId = null;
$teacherId = null;
$liveClassId = null;
$branchManagerLiveClassId = null;
$courseIds = [];
$draftCourseId = null;
$categoryIds = [];
$contentId = null;
$draftCoursePreviewContentId = null;
$paidContentId = null;
$examId = null;
$recycleExamId = null;
$marksheetId = null;
$questionBankId = null;
$cmsPostId = null;
$cmsTestimonialId = null;
$paymentId = null;
$batchId = null;
$routineId = null;
$certificateId = null;
$admissionApplicationId = null;
$managedStudentId = null;
$privatePdfFixture = null;
$invalidPdfFixture = null;
$mediaAssetId = null;

try {
    $ready = false;
    for ($attempt = 0; $attempt < 40; $attempt++) {
        $probe = @file_get_contents($base . '/api/auth.php?action=me', false, stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 1]]));
        if ($probe !== false) { $ready = true; break; }
        usleep(250000);
    }
    check($ready, 'PHP API server did not become ready.');

    $suffix = bin2hex(random_bytes(5));
    $adminEmail = "api-admin-{$suffix}@example.test";
    $studentEmail = "api-student-{$suffix}@example.test";
    $adminPassword = 'TestAdmin!Pass123';
    $studentPassword = 'TestStudent!Pass123';

    $insertUser = $db->prepare('INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)');
    $insertUser->execute(['API Integration Admin', $adminEmail, password_hash($adminPassword, PASSWORD_DEFAULT), 'admin']);
    $adminId = (int)$db->lastInsertId();
    $insertUser->execute(['API Integration Student', $studentEmail, password_hash($studentPassword, PASSWORD_DEFAULT), 'student']);
    $studentId = (int)$db->lastInsertId();
    $branchId = (int)$db->query('SELECT COALESCE(MAX(id), 0) + 1 FROM branches')->fetchColumn();
    $branchCode = 'TST-' . strtoupper($suffix);
    $db->prepare('INSERT INTO branches (id, code, name) VALUES (?, ?, ?)')->execute([$branchId, $branchCode, 'API Integration Branch']);
    $db->prepare('UPDATE users SET branch_id = ? WHERE id = ?')->execute([$branchId, $studentId]);
    $db->prepare('UPDATE users SET branch_id = ? WHERE id = ?')->execute([$branchId, $adminId]);
    $branchManagerEmail = "api-branch-manager-{$suffix}@example.test";
    $branchManagerPassword = 'TestBranchManager!Pass123';
    $insertBranchManager = $db->prepare('INSERT INTO users (name, email, password_hash, role, branch_id, is_active) VALUES (?, ?, ?, ?, ?, 1)');
    $insertBranchManager->execute(['API Integration Branch Manager', $branchManagerEmail, password_hash($branchManagerPassword, PASSWORD_DEFAULT), 'branch_manager', $branchId]);
    $branchManagerId = (int)$db->lastInsertId();
    $insertUser->execute(['API Integration Teacher', "api-teacher-{$suffix}@example.test", password_hash('TestTeacher!Pass123', PASSWORD_DEFAULT), 'teacher']);
    $teacherId = (int)$db->lastInsertId();
    $db->prepare('UPDATE users SET branch_id = ? WHERE id = ?')->execute([$branchId, $teacherId]);

    expect_status(api_request($base, '/api/notifications.php?action=list'), 401, 'Unauthenticated notification inbox is rejected');
    expect_status(api_request($base, '/api/content.php?action=list'), 401, 'Unauthenticated protected content request is rejected');
    expect_status(api_request($base, '/api/content.php?action=progress&course_id=1'), 401, 'Unauthenticated learning progress request is rejected');
    expect_status(api_request($base, '/api/exams.php?action=list'), 401, 'Unauthenticated exam list request is rejected');
    expect_status(api_request($base, '/api/cms.php?action=posts', 'GET', null, $cookie), 401, 'Unauthenticated CMS post management is rejected');
    expect_status(api_request($base, '/api/admissions.php?action=list'), 401, 'Unauthenticated admission application management is rejected');
    expect_status(api_request($base, '/api/cms.php?action=settings'), 200, 'Public website settings are readable without login');
    expect_status(api_request($base, '/api/cms.php?action=public_posts'), 200, 'Public blog list is readable without login');
    expect_status(api_request($base, '/api/cms.php?action=public_testimonials'), 200, 'Public testimonials are readable without login');
    expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => 'wrong-password'], $cookie), 401, 'Invalid credentials are rejected');

    $login = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $cookie), 200, 'Admin login');
    $csrf = $login['data']['csrf_token'] ?? null;
    check(is_string($csrf) && strlen($csrf) >= 32, 'Login did not issue a CSRF token.');

    expect_status(api_request($base, '/api/notifications.php?action=broadcast', 'POST', [
        'title' => 'Student Portal Notice', 'message' => 'Your mock exam timetable is available.',
        'type' => 'info', 'target_role' => 'student', 'action_url' => 'courses',
    ], $cookie, $csrf), 201, 'Administrator broadcasts a persistent student notification');
    $notificationStudentCookie = null;
    $notificationStudentLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $studentEmail, 'password' => $studentPassword,
    ], $notificationStudentCookie), 200, 'Student login for notification inbox test');
    $notificationStudentCsrf = $notificationStudentLogin['data']['csrf_token'] ?? null;
    $studentInbox = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student loads own notification inbox');
    $studentNotice = array_values(array_filter($studentInbox['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'Student Portal Notice'));
    check(count($studentNotice) === 1 && ($studentNotice[0]['target_role'] ?? '') === 'student' && ($studentNotice[0]['action_url'] ?? '') === 'courses', 'Student notification was not persisted with its audience and action target.');
    $studentNoticeId = (int)$studentNotice[0]['id'];
    expect_status(api_request($base, '/api/notifications.php?action=mark_read&id=' . $studentNoticeId, 'POST', [], $notificationStudentCookie, $notificationStudentCsrf), 200, 'Student marks own notification as read');
    $studentInboxAfterRead = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student unread count refreshes');
    check((int)($studentInboxAfterRead['data']['unread_count'] ?? -1) === 0, 'Notification unread count did not update after mark-read.');
    $storefrontSettings = [
        'bkashNumber' => '',
        'nagadNumber' => '',
        'ebooks' => [
            ['id' => 'ebook_test_' . $suffix, 'title' => 'API Test Premium E-Book', 'isFree' => false, 'price' => 199],
            ['id' => 'ebook_reject_' . $suffix, 'title' => 'API Test Rejected E-Book', 'isFree' => false, 'price' => 99],
            ['id' => 'ebook_free_' . $suffix, 'title' => 'API Test Free E-Book', 'isFree' => true, 'price' => 0],
            ['id' => 'ebook_archived_' . $suffix, 'title' => 'Archived E-Book', 'isFree' => false, 'price' => 50, 'isActive' => false],
        ],
        'products' => [
            ['id' => 'product_test_' . $suffix, 'title' => 'API Test Study Kit', 'price' => 350, 'inStock' => true],
            ['id' => 'product_oos_' . $suffix, 'title' => 'Unavailable Study Kit', 'price' => 100, 'inStock' => false],
            ['id' => 'product_archived_' . $suffix, 'title' => 'Archived Study Kit', 'price' => 100, 'inStock' => true, 'isActive' => false],
        ],
    ];
    $db->prepare("INSERT INTO site_settings (setting_key, setting_value, updated_by, updated_at) VALUES ('website', ?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW()")
        ->execute([json_encode($storefrontSettings, JSON_UNESCAPED_UNICODE), $adminId]);
    expect_status(api_request($base, '/api/storefront.php?action=ebook_submit', 'POST', [
        'ebook_id' => 'ebook_test_' . $suffix, 'payment_method' => 'bKash', 'trx_id' => 'EBK-NOCONFIG-' . strtoupper($suffix), 'sender_phone' => '01712345678',
    ], $notificationStudentCookie, $notificationStudentCsrf), 409, 'E-book payment is blocked until the receiver number is configured');
    $storefrontSettings['bkashNumber'] = '01912345678';
    $storefrontSettings['nagadNumber'] = '01612345678';
    $db->prepare("UPDATE site_settings SET setting_value = ?, updated_by = ?, updated_at = NOW() WHERE setting_key = 'website'")
        ->execute([json_encode($storefrontSettings, JSON_UNESCAPED_UNICODE), $adminId]);

    expect_status(api_request($base, '/api/storefront.php?action=my_ebooks', 'GET', null, $notificationStudentCookie), 200, 'Student reads verified e-book entitlements');
    expect_status(api_request($base, '/api/storefront.php?action=ebook_submit', 'POST', [
        'ebook_id' => 'ebook_test_' . $suffix, 'payment_method' => 'bKash', 'trx_id' => 'EBK-' . strtoupper($suffix), 'sender_phone' => '01712345678',
    ], $notificationStudentCookie, $notificationStudentCsrf), 201, 'Student submits a premium e-book payment reference');
    expect_status(api_request($base, '/api/storefront.php?action=ebook_submit', 'POST', [
        'ebook_id' => 'ebook_test_' . $suffix, 'payment_method' => 'bKash', 'trx_id' => 'EBK-DUP-' . strtoupper($suffix), 'sender_phone' => '01712345678',
    ], $notificationStudentCookie, $notificationStudentCsrf), 409, 'Duplicate pending e-book purchase is rejected');
    expect_status(api_request($base, '/api/storefront.php?action=ebook_submit', 'POST', [
        'ebook_id' => 'ebook_free_' . $suffix, 'payment_method' => 'bKash', 'trx_id' => 'EBK-FREE-' . strtoupper($suffix), 'sender_phone' => '01712345678',
    ], $notificationStudentCookie, $notificationStudentCsrf), 404, 'Free e-book cannot be submitted as a premium payment');
    expect_status(api_request($base, '/api/storefront.php?action=ebook_submit', 'POST', [
        'ebook_id' => 'ebook_archived_' . $suffix, 'payment_method' => 'bKash', 'trx_id' => 'EBK-ARCH-' . strtoupper($suffix), 'sender_phone' => '01712345678',
    ], $notificationStudentCookie, $notificationStudentCsrf), 404, 'Archived premium e-book cannot be purchased');
    expect_status(api_request($base, '/api/storefront.php?action=ebook_submit', 'POST', [
        'ebook_id' => 'ebook_reject_' . $suffix, 'payment_method' => 'Nagad', 'trx_id' => 'EBR-' . strtoupper($suffix), 'sender_phone' => '01812345678',
    ], $notificationStudentCookie, $notificationStudentCsrf), 201, 'Student submits a second premium e-book payment reference');
    $productOrder = expect_status(api_request($base, '/api/storefront.php?action=product_submit', 'POST', [
        'product_id' => 'product_test_' . $suffix, 'quantity' => 2, 'customer_name' => 'API Test Student',
        'customer_phone' => '01712345678', 'delivery_address' => 'House 1, Road 2, Rangpur',
    ], $notificationStudentCookie, $notificationStudentCsrf), 201, 'Student places a persistent cash-on-delivery product order');
    $productOrderId = (int)$productOrder['data']['id'];
    check(($productOrder['data']['total_amount'] ?? '') === '700.00', 'Product order total was not calculated from the server-side product price.');
    expect_status(api_request($base, '/api/storefront.php?action=product_submit', 'POST', [
        'product_id' => 'product_oos_' . $suffix, 'quantity' => 1, 'customer_name' => 'API Test Student',
        'customer_phone' => '01712345678', 'delivery_address' => 'House 1, Road 2, Rangpur',
    ], $notificationStudentCookie, $notificationStudentCsrf), 404, 'Out-of-stock product cannot be ordered');
    expect_status(api_request($base, '/api/storefront.php?action=product_submit', 'POST', [
        'product_id' => 'product_archived_' . $suffix, 'quantity' => 1, 'customer_name' => 'API Test Student',
        'customer_phone' => '01712345678', 'delivery_address' => 'House 1, Road 2, Rangpur',
    ], $notificationStudentCookie, $notificationStudentCsrf), 404, 'Archived product cannot be ordered');
    expect_status(api_request($base, '/api/storefront.php?action=product_orders', 'GET', null, $notificationStudentCookie), 403, 'Student cannot access the global product order queue');

    $ebookQueue = expect_status(api_request($base, '/api/storefront.php?action=ebook_orders&status=pending', 'GET', null, $cookie), 200, 'Admin lists pending e-book payment requests');
    $testEbookOrders = array_values(array_filter($ebookQueue['data'] ?? [], static fn(array $row): bool => str_starts_with((string)($row['trx_id'] ?? ''), 'EBK-') || str_starts_with((string)($row['trx_id'] ?? ''), 'EBR-')));
    check(count($testEbookOrders) === 2, 'Admin e-book payment queue did not contain both test requests.');
    $ebookToVerify = array_values(array_filter($testEbookOrders, static fn(array $row): bool => str_starts_with((string)$row['trx_id'], 'EBK-')))[0];
    $ebookToReject = array_values(array_filter($testEbookOrders, static fn(array $row): bool => str_starts_with((string)$row['trx_id'], 'EBR-')))[0];
    expect_status(api_request($base, '/api/storefront.php?action=ebook_verify&id=' . (int)$ebookToVerify['id'], 'POST', [], $cookie, $csrf), 200, 'Admin verifies premium e-book payment');
    expect_status(api_request($base, '/api/storefront.php?action=ebook_reject&id=' . (int)$ebookToReject['id'], 'POST', ['reason' => 'Transaction could not be confirmed.'], $cookie, $csrf), 200, 'Admin rejects an unverified e-book payment with a reason');
    $productQueue = expect_status(api_request($base, '/api/storefront.php?action=product_orders&status=pending', 'GET', null, $cookie), 200, 'Admin lists pending product orders');
    check(count(array_filter($productQueue['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $productOrderId)) === 1, 'Admin product order queue omitted the submitted order.');
    expect_status(api_request($base, '/api/storefront.php?action=product_update&id=' . $productOrderId, 'POST', ['status' => 'confirmed'], $cookie, $csrf), 200, 'Admin confirms cash-on-delivery product order');
    expect_status(api_request($base, '/api/storefront.php?action=product_update&id=' . $productOrderId, 'POST', ['status' => 'shipped'], $cookie, $csrf), 409, 'Product order cannot skip the processing state');
    expect_status(api_request($base, '/api/storefront.php?action=product_update&id=' . $productOrderId, 'POST', ['status' => 'processing'], $cookie, $csrf), 200, 'Admin moves confirmed product order into processing');
    expect_status(api_request($base, '/api/storefront.php?action=product_update&id=' . $productOrderId, 'POST', ['status' => 'shipped'], $cookie, $csrf), 200, 'Admin marks product order as shipped');
    expect_status(api_request($base, '/api/storefront.php?action=product_update&id=' . $productOrderId, 'POST', ['status' => 'delivered'], $cookie, $csrf), 200, 'Admin marks product order as delivered');
    expect_status(api_request($base, '/api/storefront.php?action=product_update&id=' . $productOrderId, 'POST', ['status' => 'cancelled'], $cookie, $csrf), 409, 'Delivered product order cannot be cancelled retroactively');
    $studentEntitlements = expect_status(api_request($base, '/api/storefront.php?action=my_ebooks', 'GET', null, $notificationStudentCookie), 200, 'Student reloads verified e-book access');
    check(in_array('ebook_test_' . $suffix, $studentEntitlements['data']['ebook_ids'] ?? [], true), 'Verified e-book purchase did not grant the expected entitlement.');
    check(!in_array('ebook_reject_' . $suffix, $studentEntitlements['data']['ebook_ids'] ?? [], true), 'Rejected e-book payment incorrectly granted access.');

    $privateEbookId = 'ebook_test_' . $suffix;
    $privatePdfFixture = tempnam(sys_get_temp_dir(), 'aec-private-pdf-');
    $invalidPdfFixture = tempnam(sys_get_temp_dir(), 'aec-invalid-pdf-');
    check(is_string($privatePdfFixture) && is_string($invalidPdfFixture), 'Could not create temporary private PDF fixtures.');
    file_put_contents($privatePdfFixture, "%PDF-1.4\nAEC private PDF integration fixture\n%%EOF\n");
    file_put_contents($invalidPdfFixture, "This is not a PDF document.");
    expect_status(api_upload_pdf($base, '/api/storefront.php?action=ebook_upload', $privateEbookId, $invalidPdfFixture, $cookie, $csrf), 415, 'Private e-book upload rejects non-PDF content');
    expect_status(api_upload_pdf($base, '/api/storefront.php?action=ebook_upload', $privateEbookId, $privatePdfFixture, $notificationStudentCookie, $notificationStudentCsrf), 403, 'Student cannot upload private e-book files');
    expect_raw_status(api_download_pdf($base, '/api/storefront.php?action=ebook_download&id=' . rawurlencode($privateEbookId)), 401, 'Private e-book download requires authentication');
    expect_raw_status(api_download_pdf($base, '/api/storefront.php?action=ebook_download&id=' . rawurlencode('ebook_reject_' . $suffix), $notificationStudentCookie), 403, 'Rejected e-book payment does not grant PDF download access');
    expect_status(api_upload_pdf($base, '/api/storefront.php?action=ebook_upload', $privateEbookId, $privatePdfFixture, $cookie, $csrf), 201, 'Administrator uploads a private e-book PDF');
    expect_status(api_upload_pdf($base, '/api/storefront.php?action=ebook_upload', 'ebook_free_' . $suffix, $privatePdfFixture, $cookie, $csrf), 201, 'Administrator uploads a private free e-book PDF');

    $privateFileList = expect_status(api_request($base, '/api/storefront.php?action=ebook_files', 'GET', null, $cookie), 200, 'Administrator lists private e-book file metadata');
    $privateFileRows = array_values(array_filter($privateFileList['data'] ?? [], static fn(array $row): bool => ($row['ebook_id'] ?? '') === $privateEbookId));
    check(count($privateFileRows) === 1 && !array_key_exists('storage_filename', $privateFileRows[0]), 'Private PDF metadata leaked its internal storage filename.');
    $privateDownload = api_download_pdf($base, '/api/storefront.php?action=ebook_download&id=' . rawurlencode($privateEbookId), $notificationStudentCookie);
    expect_raw_status($privateDownload, 200, 'Verified student downloads the private e-book PDF');
    check(str_starts_with($privateDownload['body'], '%PDF-1.4') && in_array('Content-Type: application/pdf', $privateDownload['headers'], true), 'Private e-book download did not return the expected PDF response.');
    $freePrivateDownload = api_download_pdf($base, '/api/storefront.php?action=ebook_download&id=' . rawurlencode('ebook_free_' . $suffix), $notificationStudentCookie);
    expect_raw_status($freePrivateDownload, 200, 'Authenticated student downloads a free private e-book PDF');
    check(str_starts_with($freePrivateDownload['body'], '%PDF-1.4'), 'Free private e-book download did not return a PDF file.');
    $storedFile = $db->prepare('SELECT storage_filename, sha256, size_bytes FROM ebook_files WHERE ebook_id = ? LIMIT 1');
    $storedFile->execute([$privateEbookId]);
    $storedRow = $storedFile->fetch();
    check($storedRow && preg_match('/^[a-f0-9]{48}\.pdf$/', $storedRow['storage_filename']) === 1, 'Private PDF storage filename is not random and opaque.');
    $storedPath = $root . '/storage/private/ebooks/' . $storedRow['storage_filename'];
    check(is_file($storedPath) && hash_file('sha256', $storedPath) === $storedRow['sha256'], 'Private PDF file is missing or its SHA-256 checksum is incorrect.');
    $privateStorageRules = file_get_contents($root . '/storage/private/ebooks/.htaccess');
    check(is_string($privateStorageRules) && str_contains($privateStorageRules, 'Require all denied'), 'Private PDF storage directory does not deny direct Apache web access.');


    expect_status(api_request($base, '/api/notifications.php?action=broadcast', 'POST', [
        'title' => 'Second Student Notice', 'message' => 'A second notice tests mark-all-read and delete.',
        'type' => 'warning', 'target_role' => 'student',
    ], $cookie, $csrf), 201, 'Administrator sends a second student notification');
    expect_status(api_request($base, '/api/notifications.php?action=mark_all_read', 'POST', [], $notificationStudentCookie, $notificationStudentCsrf), 200, 'Student marks all notifications as read');
    $secondInbox = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student reloads notifications after mark-all-read');
    check((int)($secondInbox['data']['unread_count'] ?? -1) === 0, 'Mark-all-read did not clear unread notifications.');
    $secondNotice = array_values(array_filter($secondInbox['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'Second Student Notice'));
    check(count($secondNotice) === 1, 'Second broadcast notification was not delivered to student inbox.');
    expect_status(api_request($base, '/api/notifications.php?action=delete&id=' . (int)$secondNotice[0]['id'], 'POST', [], $notificationStudentCookie, $notificationStudentCsrf), 200, 'Student removes only own notification');

    $notificationTeacherCookie = null;
    expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => "api-teacher-{$suffix}@example.test", 'password' => 'TestTeacher!Pass123',
    ], $notificationTeacherCookie), 200, 'Teacher login for notification audience test');
    $teacherInbox = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationTeacherCookie), 200, 'Teacher loads own notification inbox');
    check(count(array_filter($teacherInbox['data']['items'] ?? [], static fn(array $row): bool => in_array($row['title'] ?? '', ['Student Portal Notice','Second Student Notice'], true))) === 0, 'Student-only broadcast leaked into the teacher inbox.');
    expect_status(api_request($base, '/api/notifications.php?action=broadcast', 'POST', [
        'title' => 'Unsafe Action Notice', 'message' => 'Invalid destination must be rejected.',
        'type' => 'alert', 'target_role' => 'student', 'action_url' => 'https://evil.example',
    ], $cookie, $csrf), 422, 'Notification broadcast rejects external action URLs');

    $managedStudentEmail = "api-managed-student-{$suffix}@example.test";
    $managedStudent = expect_status(api_request($base, '/api/users.php?action=create', 'POST', [
        'name' => 'Managed API Student', 'email' => $managedStudentEmail,
        'phone' => '+8801700000001', 'password' => 'ManagedStudent!Pass123',
        'role' => 'student', 'branch_id' => null,
    ], $cookie, $csrf), 201, 'Admin creates a student through the user management API');
    $managedStudentId = (int)$managedStudent['data']['id'];
    expect_status(api_request($base, '/api/users.php?action=create', 'POST', [
        'name' => 'Duplicate API Student', 'email' => $managedStudentEmail,
        'password' => 'ManagedStudent!Pass123', 'role' => 'student',
    ], $cookie, $csrf), 409, 'User API rejects duplicate email addresses');
    $managedUserList = expect_status(api_request($base, '/api/users.php?action=list&q=' . urlencode($managedStudentEmail), 'GET', null, $cookie), 200, 'Admin searches server-backed user records');
    check(count($managedUserList['data'] ?? []) === 1 && (int)$managedUserList['data'][0]['id'] === $managedStudentId, 'User management API did not return the newly created student.');
    expect_status(api_request($base, '/api/users.php?action=update&id=' . $managedStudentId, 'POST', [
        'name' => 'Updated Managed API Student', 'phone' => '+8801700000002',
    ], $cookie, $csrf), 200, 'Admin updates a student profile through the user API');
    expect_status(api_request($base, '/api/users.php?action=deactivate&id=' . $adminId, 'POST', [], $cookie, $csrf), 403, 'Admin cannot deactivate their own account');
    expect_status(api_request($base, '/api/users.php?action=deactivate&id=' . $managedStudentId, 'POST', [], $cookie, $csrf), 200, 'Admin deactivates a student account without deleting records');
    $managedStudentRecord = $db->prepare('SELECT is_active, name FROM users WHERE id = ?');
    $managedStudentRecord->execute([$managedStudentId]);
    $managedStudentRow = $managedStudentRecord->fetch();
    check($managedStudentRow && (int)$managedStudentRow['is_active'] === 0 && $managedStudentRow['name'] === 'Updated Managed API Student', 'Deactivation deleted or corrupted the student record.');
    $managedStudentCookie = null;
    expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $managedStudentEmail, 'password' => 'ManagedStudent!Pass123',
    ], $managedStudentCookie), 401, 'Deactivated student cannot sign in');
    $savedSettings = expect_status(api_request($base, '/api/cms.php?action=save_settings', 'POST', [
        'settings' => [
            'siteName' => 'Alom Test Center', 'tagline' => 'API CMS Test', 'showAdmissionBanner' => true,
            'sliderIntervalSec' => 6,
            'logoUrl' => 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            'faviconUrl' => 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
            'sliders' => [[
                'id' => 'cms-test-slide', 'title' => 'CMS Test', 'imageUrl' => 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"></svg>',
                'buttonLink' => '#courses', 'isActive' => true, 'order' => 1,
            ]],
            'homepageSections' => ['showEbooks' => true, 'showProducts' => true],
            'themeSettings' => ['primaryColor' => '#0B5CD5', 'cardBg' => '#FFFFFF'],
            'learningPaths' => [['id' => 'cms-path', 'theme' => 'pink']],
            'instructors' => [['id' => 'cms-instructor', 'name' => 'Verified Instructor']],
            'ebooks' => [['id' => 'cms-ebook', 'title' => 'CMS E-Book', 'isFree' => true, 'price' => 0, 'topics' => ['Reading'], 'isActive' => true]],
            'products' => [['id' => 'cms-product', 'title' => 'CMS Product', 'price' => 250, 'inStock' => false, 'isActive' => false]],
        ],
    ], $cookie, $csrf), 200, 'Admin saves persistent website settings');
    check(($savedSettings['data']['siteName'] ?? '') === 'Alom Test Center', 'CMS settings save response did not contain the updated site name.');
    $publicSettings = expect_status(api_request($base, '/api/cms.php?action=settings'), 200, 'Public website settings reload');
    check(($publicSettings['data']['siteName'] ?? '') === 'Alom Test Center', 'Website settings were not persisted to MySQL.');
    check(($publicSettings['data']['ebooks'][0]['id'] ?? '') === 'cms-ebook', 'AI Studio e-book catalog settings were not persisted.');
    check(($publicSettings['data']['products'][0]['id'] ?? '') === 'cms-product', 'AI Studio product catalog settings were not persisted.');
    check(($publicSettings['data']['homepageSections']['showEbooks'] ?? false) === true, 'AI Studio homepage section visibility was not persisted.');
    check(($publicSettings['data']['themeSettings']['primaryColor'] ?? '') === '#0B5CD5', 'AI Studio theme settings were not persisted.');
    expect_status(api_request($base, '/api/cms.php?action=save_settings', 'POST', [
        'settings' => ['googleMapEmbedUrl' => 'javascript:alert(1)'],
    ], $cookie, $csrf), 422, 'CMS rejects unsafe website embed URLs');
    expect_status(api_request($base, '/api/cms.php?action=save_settings', 'POST', [
        'settings' => ['homepageSections' => ['showCourses' => 'yes']],
    ], $cookie, $csrf), 422, 'CMS rejects non-boolean homepage section visibility values');
    expect_status(api_request($base, '/api/cms.php?action=save_settings', 'POST', [
        'settings' => ['themeSettings' => ['primaryColor' => 'javascript:alert(1)']],
    ], $cookie, $csrf), 422, 'CMS rejects unsafe homepage theme color values');
    expect_status(api_request($base, '/api/cms.php?action=save_settings', 'POST', [
        'settings' => ['ebooks' => [['id' => 'premium-public-pdf', 'title' => 'Premium PDF', 'isFree' => false, 'price' => 99, 'pdfUrl' => 'https://cdn.example.test/premium.pdf']]],
    ], $cookie, $csrf), 422, 'CMS rejects public PDF URLs for premium e-books');
    expect_status(api_request($base, '/api/cms.php?action=save_settings', 'POST', [
        'settings' => ['ebooks' => [['id' => 'free-public-pdf', 'title' => 'Free PDF', 'isFree' => true, 'price' => 0, 'pdfUrl' => 'https://cdn.example.test/free.pdf']]],
    ], $cookie, $csrf), 200, 'CMS allows HTTPS PDF URLs for free e-books only');

    $cmsPost = expect_status(api_request($base, '/api/cms.php?action=create_post', 'POST', [
        'title' => 'API CMS Article', 'slug' => 'api-cms-article-' . $suffix,
        'excerpt' => 'A concise CMS integration test excerpt.',
        'content' => '<p>Safe article body</p><script>alert(1)</script>',
        'category' => 'Testing', 'author' => 'Alom Test Center', 'read_time_minutes' => 4,
        'seo_title' => 'API CMS Article SEO', 'seo_description' => 'A tested SEO description.',
        'status' => 'draft',
    ], $cookie, $csrf), 201, 'Admin creates a draft CMS article');
    $cmsPostId = (int)$cmsPost['data']['id'];
    check(is_string($cookie) && str_starts_with($cookie, 'AEC_LMS_SESSION='), 'Admin session cookie was not retained after CMS article creation.');
    expect_status(api_request($base, '/api/auth.php?action=me', 'GET', null, $cookie), 200, 'Admin session remains active after CMS article creation');
    $adminPosts = expect_status(api_request($base, '/api/cms.php?action=posts', 'GET', null, $cookie), 200, 'Admin loads draft and published CMS articles');
    check(in_array($cmsPostId, array_map(static fn(array $post): int => (int)$post['id'], $adminPosts['data'] ?? []), true), 'Admin CMS post list omitted the draft article.');
    $publicPostsBefore = expect_status(api_request($base, '/api/cms.php?action=public_posts'), 200, 'Public CMS article list before publishing');
    check(!in_array($cmsPostId, array_map(static fn(array $post): int => (int)$post['id'], $publicPostsBefore['data'] ?? []), true), 'Public blog list exposed a draft article.');
    expect_status(api_request($base, '/api/cms.php?action=update_post&id=' . $cmsPostId, 'POST', [
        'title' => 'API CMS Article', 'slug' => 'api-cms-article-' . $suffix,
        'excerpt' => 'A concise CMS integration test excerpt.',
        'content' => '<p>Safe article body</p><script>alert(1)</script>',
        'category' => 'Testing', 'author' => 'Alom Test Center', 'read_time_minutes' => 4,
        'seo_title' => 'API CMS Article SEO', 'seo_description' => 'A tested SEO description.',
        'status' => 'published',
    ], $cookie, $csrf), 200, 'Admin publishes the CMS article');
    $publicPost = expect_status(api_request($base, '/api/cms.php?action=post&slug=api-cms-article-' . $suffix), 200, 'Public reads a published CMS article');
    check(!str_contains((string)($publicPost['data']['content'] ?? ''), '<script'), 'CMS article content retained executable HTML tags.');
    check(($publicPost['data']['seoTitle'] ?? '') === 'API CMS Article SEO', 'CMS SEO title was not persisted.');
    expect_status(api_request($base, '/api/cms.php?action=create_post', 'POST', [
        'title' => 'Duplicate CMS Article', 'slug' => 'api-cms-article-' . $suffix,
        'excerpt' => 'Duplicate slug test.', 'content' => 'Duplicate content.',
        'category' => 'Testing', 'author' => 'Alom Test Center', 'read_time_minutes' => 2, 'status' => 'published',
    ], $cookie, $csrf), 409, 'CMS rejects duplicate article slugs');

    $cmsTestimonial = expect_status(api_request($base, '/api/cms.php?action=create_testimonial', 'POST', [
        'student_name' => 'API Test Student', 'achievement' => 'IELTS Band 7.5',
        'quote' => 'The API-backed CMS saved my real testimonial.', 'quote_bn' => 'টেস্ট',
        'rating' => 5, 'course_name' => 'IELTS Preparation', 'status' => 'draft',
    ], $cookie, $csrf), 201, 'Admin creates a draft testimonial');
    $cmsTestimonialId = (int)$cmsTestimonial['data']['id'];
    expect_status(api_request($base, '/api/cms.php?action=create_testimonial', 'POST', [
        'student_name' => 'Invalid Rating Student', 'achievement' => 'Invalid',
        'quote' => 'Invalid rating test.', 'rating' => 6, 'course_name' => 'IELTS', 'status' => 'published',
    ], $cookie, $csrf), 422, 'CMS rejects testimonial ratings outside one to five');
    expect_status(api_request($base, '/api/cms.php?action=update_testimonial&id=' . $cmsTestimonialId, 'POST', [
        'student_name' => 'API Test Student', 'achievement' => 'IELTS Band 7.5',
        'quote' => 'The API-backed CMS saved my real testimonial.', 'quote_bn' => 'টেস্ট',
        'rating' => 5, 'course_name' => 'IELTS Preparation', 'status' => 'published',
    ], $cookie, $csrf), 200, 'Admin publishes testimonial');
    $publicTestimonials = expect_status(api_request($base, '/api/cms.php?action=public_testimonials'), 200, 'Public testimonial list after publishing');
    check(in_array($cmsTestimonialId, array_map(static fn(array $item): int => (int)$item['id'], $publicTestimonials['data'] ?? []), true), 'Published testimonial was not visible publicly.');
    expect_status(api_request($base, '/api/cms.php?action=delete_post&id=' . $cmsPostId, 'POST', [], $cookie, $csrf), 200, 'Admin archives a CMS post into recycle bin');
    $cmsRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle bin lists CMS content');
    $cmsPostRecycleItem = array_values(array_filter($cmsRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'cms_post' && (int)$row['entity_id'] === $cmsPostId))[0] ?? null;
    check(is_array($cmsPostRecycleItem), 'CMS post was not registered in recycle bin.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=restore&id=' . (int)$cmsPostRecycleItem['id'], 'POST', [], $cookie, $csrf), 200, 'Admin restores CMS post');
    expect_status(api_request($base, '/api/cms.php?action=post&slug=api-cms-article-' . $suffix), 200, 'Restored CMS post is publicly readable again');

    expect_status(api_request($base, '/api/cms.php?action=delete_testimonial&id=' . $cmsTestimonialId, 'POST', [], $cookie, $csrf), 200, 'Admin archives testimonial into recycle bin');
    $testimonialRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle bin lists archived testimonials');
    $testimonialRecycleItem = array_values(array_filter($testimonialRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'cms_testimonial' && (int)$row['entity_id'] === $cmsTestimonialId))[0] ?? null;
    check(is_array($testimonialRecycleItem), 'CMS testimonial was not registered in recycle bin.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=restore&id=' . (int)$testimonialRecycleItem['id'], 'POST', [], $cookie, $csrf), 200, 'Admin restores CMS testimonial');
    expect_status(api_request($base, '/api/cms.php?action=public_testimonials'), 200, 'Restored testimonial is publicly available again');
    expect_status(api_request($base, '/api/cms.php?action=delete_testimonial&id=' . $cmsTestimonialId, 'POST', [], $cookie, $csrf), 200, 'Admin deletes testimonial again for retention test');
    $expiredRecycleId = (int)$db->query("SELECT id FROM recycle_bin_items WHERE entity_type = 'cms_testimonial' AND entity_id = " . $cmsTestimonialId . " AND status = 'active' ORDER BY id DESC LIMIT 1")->fetchColumn();
    check($expiredRecycleId > 0, 'Second testimonial deletion did not create a new recycle-bin record.');
    $db->prepare('UPDATE recycle_bin_items SET expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id = ?')->execute([$expiredRecycleId]);
    $afterExpiryPurge = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle-bin listing purges expired records automatically');
    check(!in_array($expiredRecycleId, array_map(static fn(array $row): int => (int)$row['id'], $afterExpiryPurge['data'] ?? []), true), 'Expired testimonial remained active in recycle bin.');
    $expiredStatus = $db->prepare('SELECT status FROM recycle_bin_items WHERE id = ?'); $expiredStatus->execute([$expiredRecycleId]);
    check($expiredStatus->fetchColumn() === 'purged', 'Expired recycle-bin item was not marked purged.');
    $emptyRecycleResult = expect_status(api_request($base, '/api/recycle_bin.php?action=empty', 'POST', [], $cookie, $csrf), 200, 'Admin empties only eligible recycle-bin items');
    check((int)($emptyRecycleResult['data']['purged'] ?? -1) === 0, 'Empty recycle bin unexpectedly deleted records that had already been restored or purged.');
    expect_status(api_request($base, '/api/courses.php?action=create', 'POST', ['title' => 'No CSRF', 'slug' => 'no-csrf'], $cookie), 419, 'Missing CSRF token is rejected');

    $otherBranch = expect_status(api_request($base, '/api/branches.php?action=create', 'POST', [
        'code' => 'OTH-' . strtoupper($suffix), 'name' => 'API Integration Other Branch', 'city' => 'Dhaka',
    ], $cookie, $csrf), 201, 'Admin creates a branch');
    $otherBranchId = (int)$otherBranch['data']['id'];
    expect_status(api_request($base, '/api/branches.php?action=update&id=' . $otherBranchId, 'POST', [
        'code' => 'OTH-' . strtoupper($suffix), 'name' => 'API Integration Other Branch Updated', 'city' => 'Rangpur',
    ], $cookie, $csrf), 200, 'Admin updates branch details');
    expect_status(api_request($base, '/api/branches.php?action=deactivate&id=' . $otherBranchId, 'POST', [], $cookie, $csrf), 200, 'Admin deactivates a branch without deleting its history');

    $category = expect_status(api_request($base, '/api/categories.php?action=create', 'POST', [
        'name' => 'API Integration Category', 'name_bn' => 'টেস্ট ক্যাটাগরি', 'slug' => 'api-category-' . $suffix, 'sort_order' => 10,
    ], $cookie, $csrf), 201, 'Admin creates course category');
    $categoryId = (int)$category['data']['id'];
    $categoryIds[] = $categoryId;
    $childCategory = expect_status(api_request($base, '/api/categories.php?action=create', 'POST', [
        'name' => 'API Integration Child Category', 'slug' => 'api-child-category-' . $suffix, 'parent_id' => $categoryId,
    ], $cookie, $csrf), 201, 'Admin creates nested child category');
    $childCategoryId = (int)$childCategory['data']['id'];
    $categoryIds[] = $childCategoryId;
    $categories = expect_status(api_request($base, '/api/categories.php?action=list'), 200, 'Public category list');
    check(count(array_filter($categories['data'] ?? [], fn(array $item): bool => in_array((int)$item['id'], $categoryIds, true))) === 2, 'Category list did not return both test categories.');
    expect_status(api_request($base, '/api/categories.php?action=update&id=' . $categoryId, 'POST', [
        'name' => 'API Integration Category', 'slug' => 'api-category-' . $suffix, 'parent_id' => $childCategoryId,
    ], $cookie, $csrf), 422, 'Category hierarchy cycle is rejected');
    expect_status(api_request($base, '/api/categories.php?action=delete&id=' . $childCategoryId, 'POST', [], $cookie, $csrf), 200, 'Unused child category can be deleted');

    $coursePayload = ['title' => 'API Integration English Course', 'slug' => "api-course-{$suffix}", 'price' => 1000, 'status' => 'published', 'category_id' => $categoryId, 'branch_id' => $branchId];
    $courseResponse = expect_status(api_request($base, '/api/courses.php?action=create', 'POST', $coursePayload, $cookie, $csrf), 201, 'Admin creates published course');
    $courseIds[] = (int)$courseResponse['data']['id'];
    $coursePayload2 = ['title' => 'API Integration Second Course', 'slug' => "api-course-two-{$suffix}", 'price' => 500, 'status' => 'published'];
    $courseResponse2 = expect_status(api_request($base, '/api/courses.php?action=create', 'POST', $coursePayload2, $cookie, $csrf), 201, 'Admin creates second published course');
    $courseIds[] = (int)$courseResponse2['data']['id'];

    $liveClass = expect_status(api_request($base, '/api/live_classes.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'instructor_id' => $teacherId,
        'title' => 'API Integration Live Class', 'date' => '2026-12-10', 'time' => '18:30',
        'meeting_platform' => 'google_meet', 'meeting_url' => 'https://meet.google.com/abc-defg-hij',
    ], $cookie, $csrf), 201, 'Admin schedules a persistent live class');
    $liveClassId = (int)$liveClass['data']['id'];
    $teacherInboxAfterSchedule = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationTeacherCookie), 200, 'Teacher receives live class assignment notification');
    check(count(array_filter($teacherInboxAfterSchedule['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'New live class assigned')) === 1, 'Live class assignment did not notify the instructor.');
    $branchManagerCookie = null;
    $branchManagerLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $branchManagerEmail, 'password' => $branchManagerPassword,
    ], $branchManagerCookie), 200, 'Branch manager login for branch-scoped authorization tests');
    $branchManagerCsrf = $branchManagerLogin['data']['csrf_token'] ?? null;
    check(is_string($branchManagerCsrf) && strlen($branchManagerCsrf) >= 32, 'Branch manager login did not issue a CSRF token.');
    expect_status(api_request($base, '/api/notifications.php?action=broadcast', 'POST', [
        'title' => 'Forbidden Branch Broadcast', 'message' => 'Branch managers cannot send global announcements.',
        'type' => 'info', 'target_role' => 'all',
    ], $branchManagerCookie, $branchManagerCsrf), 403, 'Branch manager cannot broadcast global notifications');
    $branchList = expect_status(api_request($base, '/api/branches.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager can view only assigned branch details');
    check(count($branchList['data'] ?? []) === 1 && (int)$branchList['data'][0]['id'] === $branchId, 'Branch manager received another branch record.');
    expect_status(api_request($base, '/api/branches.php?action=create', 'POST', ['code' => 'DENY-' . strtoupper($suffix), 'name' => 'Forbidden Branch'], $branchManagerCookie), 403, 'Branch manager cannot create global branches');
    expect_status(api_request($base, '/api/categories.php?action=update&id=' . $categoryId, 'POST', [
        'name' => 'Cross Branch Category Edit', 'slug' => 'cross-branch-category-' . $suffix,
    ], $branchManagerCookie, $branchManagerCsrf), 404, 'Branch manager cannot edit the shared global category registry');
    $branchUsers = expect_status(api_request($base, '/api/users.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager lists users in assigned branch');
    $branchUserIds = array_map(static fn(array $item): int => (int)$item['id'], $branchUsers['data'] ?? []);
    check(in_array($studentId, $branchUserIds, true) && !in_array($adminId, $branchUserIds, true), 'Branch user list leaked another branch or omitted its student.');
    expect_status(api_request($base, '/api/users.php?action=update&id=' . $managedStudentId, 'POST', ['name' => 'Cross Branch Attempt'], $branchManagerCookie, $branchManagerCsrf), 404, 'Branch manager cannot update another branch user');
    $branchManagedStudent = expect_status(api_request($base, '/api/users.php?action=create', 'POST', [
        'name' => 'Branch Managed Student', 'email' => "branch-student-{$suffix}@example.test",
        'password' => 'BranchStudent!Pass123', 'role' => 'student', 'branch_id' => null,
    ], $branchManagerCookie, $branchManagerCsrf), 201, 'Branch manager creates a student constrained to assigned branch');
    $branchManagedStudentId = (int)$branchManagedStudent['data']['id'];
    $branchStudentCheck = $db->prepare('SELECT branch_id FROM users WHERE id = ?');
    $branchStudentCheck->execute([$branchManagedStudentId]);
    check((int)$branchStudentCheck->fetchColumn() === $branchId, 'Branch manager created a user outside the assigned branch.');
    expect_status(api_request($base, '/api/users.php?action=update&id=' . $branchManagedStudentId, 'POST', ['role' => 'admin'], $branchManagerCookie, $branchManagerCsrf), 403, 'Branch manager cannot escalate a student to administrator');
    $branchManagedCategory = expect_status(api_request($base, '/api/categories.php?action=create', 'POST', [
        'name' => 'Branch Owned Category', 'slug' => "branch-category-{$suffix}",
    ], $branchManagerCookie, $branchManagerCsrf), 201, 'Branch manager creates a category owned by assigned branch');
    $branchManagedCategoryId = (int)$branchManagedCategory['data']['id'];
    $categoryIds[] = $branchManagedCategoryId;
    $branchCategoryCheck = $db->prepare('SELECT branch_id FROM course_categories WHERE id = ?');
    $branchCategoryCheck->execute([$branchManagedCategoryId]);
    check((int)$branchCategoryCheck->fetchColumn() === $branchId, 'Branch manager created a category outside assigned branch.');
    $branchCategories = expect_status(api_request($base, '/api/categories.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager lists shared and own categories');
    check(in_array($branchManagedCategoryId, array_map(static fn(array $row): int => (int)$row['id'], $branchCategories['data'] ?? []), true), 'Branch manager cannot see its own branch category.');
    $branchManagedCourse = expect_status(api_request($base, '/api/courses.php?action=create', 'POST', [
        'title' => 'Branch Managed Course', 'slug' => "branch-managed-course-{$suffix}", 'price' => 300, 'status' => 'published', 'category_id' => $branchManagedCategoryId,
    ], $branchManagerCookie, $branchManagerCsrf), 201, 'Branch manager creates a course within assigned branch');
    $branchManagedCourseId = (int)$branchManagedCourse['data']['id'];
    $branchCourseCheck = $db->prepare('SELECT branch_id FROM courses WHERE id = ?');
    $branchCourseCheck->execute([$branchManagedCourseId]);
    check((int)$branchCourseCheck->fetchColumn() === $branchId, 'Branch manager created a course outside assigned branch.');
    $branchCourses = expect_status(api_request($base, '/api/courses.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager lists branch-owned courses');
    $branchCourseIds = array_map(static fn(array $item): int => (int)$item['id'], $branchCourses['data'] ?? []);
    check(in_array($courseIds[0], $branchCourseIds, true) && !in_array($courseIds[1], $branchCourseIds, true), 'Branch course list leaked a course outside its branch.');
    expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[1], 'GET', null, $branchManagerCookie), 404, 'Branch manager cannot open a course outside assigned branch');
    expect_status(api_request($base, '/api/enrollments.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager can list scoped enrollments');
    expect_status(api_request($base, '/api/payments.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager can list scoped payments');
    expect_status(api_request($base, '/api/attendance.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager can list scoped attendance');
    expect_status(api_request($base, '/api/certificates.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager can list scoped certificates');
    $branchLiveClasses = expect_status(api_request($base, '/api/live_classes.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager lists only branch live classes');
    check(in_array($liveClassId, array_map(static fn(array $item): int => (int)$item['id'], $branchLiveClasses['data'] ?? []), true), 'Branch manager did not see the live class belonging to its branch.');
    $branchManagerLiveClass = expect_status(api_request($base, '/api/live_classes.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'instructor_id' => $teacherId,
        'title' => 'Branch Manager Scheduled Class', 'date' => '2026-12-11', 'time' => '20:00',
        'meeting_platform' => 'google_meet', 'meeting_url' => 'https://meet.google.com/xyz-abcd-efg',
    ], $branchManagerCookie, $branchManagerCsrf), 201, 'Branch manager schedules a class within its branch');
    $branchManagerLiveClassId = (int)$branchManagerLiveClass['data']['id'];
    expect_status(api_request($base, '/api/live_classes.php?action=create', 'POST', [
        'course_id' => $courseIds[1], 'instructor_id' => $teacherId,
        'title' => 'Cross Branch Class', 'date' => '2026-12-11', 'time' => '20:30',
        'meeting_platform' => 'google_meet', 'meeting_url' => 'https://meet.google.com/qwe-rtyu-iop',
    ], $branchManagerCookie, $branchManagerCsrf), 403, 'Branch manager cannot schedule a class for an unassigned course');
    $teacherCookie = null;
    expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => "api-teacher-{$suffix}@example.test", 'password' => 'TestTeacher!Pass123',
    ], $teacherCookie), 200, 'Teacher login for live class ownership test');
    $teacherLiveClasses = expect_status(api_request($base, '/api/live_classes.php?action=list', 'GET', null, $teacherCookie), 200, 'Teacher lists assigned live classes');
    check(in_array($liveClassId, array_map(static fn(array $item): int => (int)$item['id'], $teacherLiveClasses['data'] ?? []), true), 'Assigned teacher could not see their own live class.');
    expect_status(api_request($base, '/api/live_classes.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'instructor_id' => $teacherId,
        'title' => 'Unsafe URL Live Class', 'date' => '2026-12-10', 'time' => '19:00',
        'meeting_platform' => 'google_meet', 'meeting_url' => 'https://evil.example/meeting',
    ], $cookie, $csrf), 422, 'Live class rejects a meeting URL outside the selected provider');
    $liveClassList = expect_status(api_request($base, '/api/live_classes.php?action=list', 'GET', null, $cookie), 200, 'Admin lists persistent live classes');
    check(in_array($liveClassId, array_map(static fn(array $item): int => (int)$item['id'], $liveClassList['data'] ?? []), true), 'Live class list omitted the newly scheduled class.');
    expect_status(api_request($base, '/api/live_classes.php?action=update&id=' . $liveClassId, 'POST', [
        'status' => 'live',
    ], $cookie, $csrf), 200, 'Admin starts a scheduled live class');
    expect_status(api_request($base, '/api/live_classes.php?action=update&id=' . $liveClassId, 'POST', [
        'status' => 'completed', 'recording_url' => 'https://cdn.example.test/recordings/live-class.mp4',
    ], $cookie, $csrf), 200, 'Admin completes a live class and stores its HTTPS recording');
    $liveClassRow = $db->prepare('SELECT status, recording_url FROM live_classes WHERE id = ?');
    $liveClassRow->execute([$liveClassId]);
    $liveClassSaved = $liveClassRow->fetch();
    check($liveClassSaved && $liveClassSaved['status'] === 'completed' && $liveClassSaved['recording_url'] === 'https://cdn.example.test/recordings/live-class.mp4', 'Live class status or recording URL was not persisted.');
    expect_status(api_request($base, '/api/live_classes.php?action=update&id=' . $liveClassId, 'POST', [
        'status' => 'completed', 'recording_url' => 'javascript:alert(1)',
    ], $cookie, $csrf), 422, 'Live class rejects unsafe recording URLs');
    expect_status(api_request($base, '/api/live_classes.php?action=update&id=' . $liveClassId, 'POST', [
        'status' => 'live',
    ], $cookie, $csrf), 409, 'Completed live class cannot transition back to live');
    expect_status(api_request($base, '/api/live_classes.php?action=cancel&id=' . $liveClassId, 'POST', [], $cookie, $csrf), 409, 'Completed live class cannot be cancelled');

    $publicAdmissionCookie = null;
    $application = expect_status(api_request($base, '/api/admissions.php?action=submit', 'POST', [
        'name' => 'Public Admission Applicant', 'email' => "admission-{$suffix}@example.test",
        'phone' => '+8801700000003', 'course_id' => $courseIds[0],
        'branch_label' => 'Dhaka Campus', 'preferred_contact' => 'phone',
        'message' => 'I would like to know the next IELTS batch.',
    ], $publicAdmissionCookie), 201, 'Public visitor submits a persistent admission inquiry');
    $applicationReference = (string)($application['data']['reference_code'] ?? '');
    $applicationIdQuery = $db->prepare('SELECT id FROM admission_applications WHERE reference_code = ? LIMIT 1');
    $applicationIdQuery->execute([$applicationReference]);
    $admissionApplicationId = (int)$applicationIdQuery->fetchColumn();
    check($admissionApplicationId > 0, 'Admission application was not persisted to the test database.');
    check(str_starts_with($applicationReference, 'AEC-ADM-') && ($application['data']['status'] ?? '') === 'pending', 'Admission application response did not return a pending reference.');
    expect_status(api_request($base, '/api/admissions.php?action=submit', 'POST', [
        'name' => 'Invalid Applicant', 'email' => 'not-an-email',
        'phone' => '+8801700000004', 'course_id' => $courseIds[0],
    ], $publicAdmissionCookie), 422, 'Admission API rejects invalid email addresses');
    $applicationList = expect_status(api_request($base, '/api/admissions.php?action=list', 'GET', null, $cookie), 200, 'Admin lists public admission inquiries');
    check(count(array_filter($applicationList['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $admissionApplicationId)) === 1, 'Admin admission list omitted the submitted inquiry.');
    expect_status(api_request($base, '/api/admissions.php?action=update&id=' . $admissionApplicationId, 'POST', [
        'status' => 'contacted', 'review_notes' => 'Called applicant; shared course details.',
    ], $cookie, $csrf), 200, 'Admin marks an admission inquiry as contacted');
    $applicationStatus = $db->prepare('SELECT status, review_notes FROM admission_applications WHERE id = ?');
    $applicationStatus->execute([$admissionApplicationId]);
    $applicationRow = $applicationStatus->fetch();
    check($applicationRow && $applicationRow['status'] === 'contacted' && $applicationRow['review_notes'] === 'Called applicant; shared course details.', 'Admission application review was not persisted.');
    $admissionAudit = $db->prepare("SELECT COUNT(*) FROM audit_logs WHERE entity_type = 'admission_application' AND entity_id = ? AND action = 'admission.application.updated'");
    $admissionAudit->execute([$admissionApplicationId]);
    check((int)$admissionAudit->fetchColumn() === 1, 'Admission application status change was not audit logged.');
    $draftCourse = expect_status(api_request($base, '/api/courses.php?action=create', 'POST', [
        'title' => 'API Integration Draft Course', 'slug' => "api-draft-course-{$suffix}", 'price' => 250, 'status' => 'draft',
    ], $cookie, $csrf), 201, 'Admin creates draft course');
    $draftCourseId = (int)$draftCourse['data']['id'];
    $adminCourseList = expect_status(api_request($base, '/api/courses.php?action=list', 'GET', null, $cookie), 200, 'Course manager can list published and draft courses');
    check(in_array($draftCourseId, array_map(static fn(array $course): int => (int)$course['id'], $adminCourseList['data'] ?? []), true), 'Course manager list omitted a draft course.');
    expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $draftCourseId, 'GET', null, $cookie), 200, 'Course manager can open a draft course in the classroom');

    expect_status(api_request($base, '/api/exams.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'title' => 'Invalid Exam Window', 'duration_minutes' => 10,
        'pass_marks' => 0, 'negative_mark_per_wrong' => 0, 'max_attempts' => 1, 'status' => 'draft',
        'opens_at' => '2026-11-15 12:00:00', 'closes_at' => '2026-11-14 12:00:00',
    ], $cookie, $csrf), 422, 'Exam closing time must follow its opening time');
    $exam = expect_status(api_request($base, '/api/exams.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'title' => 'API Integration MCQ Exam', 'description' => 'Server graded test exam.',
        'duration_minutes' => 10, 'pass_marks' => 1.5, 'negative_mark_per_wrong' => 0.25, 'max_attempts' => 1, 'status' => 'draft',
    ], $cookie, $csrf), 201, 'Admin creates a draft examination');
    $examId = (int)$exam['data']['id'];
    expect_status(api_request($base, '/api/exams.php?action=update&id=' . $examId, 'POST', [
        'course_id' => $courseIds[0], 'title' => 'API Integration MCQ Exam', 'duration_minutes' => 10,
        'pass_marks' => 1.5, 'negative_mark_per_wrong' => 0.25, 'max_attempts' => 1, 'status' => 'published',
    ], $cookie, $csrf), 422, 'Exam cannot be published before questions exist');
    expect_status(api_request($base, '/api/exams.php?action=save_questions&id=' . $examId, 'POST', [
        'questions' => [
            ['question' => 'Invalid option index', 'options' => ['One', 'Two'], 'correct_option_index' => 3, 'marks' => 1],
        ],
    ], $cookie, $csrf), 422, 'Invalid correct option index is rejected');
    $bankQuestion = expect_status(api_request($base, '/api/question_bank.php?action=create', 'POST', [
        'category' => 'IELTS Academic', 'question_text' => 'Which word is closest in meaning to concise?',
        'options' => ['Brief', 'Confusing', 'Lengthy'], 'correct_option_index' => 0, 'explanation' => 'Concise means brief and clear.',
        'marks' => 1, 'difficulty' => 'beginner', 'tags' => ['IELTS', 'Vocabulary'], 'status' => 'published',
    ], $cookie, $csrf), 201, 'Admin creates a reusable published question bank item');
    $questionBankId = (int)$bankQuestion['data']['id'];
    $bankList = expect_status(api_request($base, '/api/question_bank.php?action=list', 'GET', null, $cookie), 200, 'Admin lists reusable question bank items');
    check(in_array($questionBankId, array_map(static fn(array $item): int => (int)$item['id'], $bankList['data'] ?? []), true), 'Question bank list omitted the newly created item.');

    expect_status(api_request($base, '/api/exams.php?action=save_questions&id=' . $examId, 'POST', [
        'questions' => [
            ['question' => 'Choose the correct article.', 'options' => ['A', 'An', 'The', 'No article'], 'correct_option_index' => 1, 'marks' => 2, 'explanation' => 'Use an before a vowel sound.'],
            ['question' => 'Choose the correct verb.', 'options' => ['is', 'are'], 'correct_option_index' => 0, 'marks' => 2, 'explanation' => 'The subject is singular.'],
        ],
    ], $cookie, $csrf), 200, 'Admin saves exam questions and calculated marks');
    $imported = expect_status(api_request($base, '/api/question_bank.php?action=add_to_exam&exam_id=' . $examId, 'POST', [
        'question_bank_ids' => [$questionBankId],
    ], $cookie, $csrf), 200, 'Admin imports a reusable question bank item into a draft exam');
    check((int)$imported['data']['imported_count'] === 1 && (float)$imported['data']['total_marks'] === 5.0, 'Question bank import did not update exam marks.');
    expect_status(api_request($base, '/api/question_bank.php?action=add_to_exam&exam_id=' . $examId, 'POST', [
        'question_bank_ids' => [$questionBankId],
    ], $cookie, $csrf), 409, 'Question bank item cannot be duplicated in the same exam');
    expect_status(api_request($base, '/api/question_bank.php?action=delete&id=' . $questionBankId, 'POST', [], $cookie, $csrf), 409, 'Question bank item already used in an exam cannot be archived');
    expect_status(api_request($base, '/api/exams.php?action=update&id=' . $examId, 'POST', [
        'course_id' => $courseIds[0], 'title' => 'API Integration MCQ Exam', 'description' => 'Server graded test exam.',
        'duration_minutes' => 10, 'pass_marks' => 1.5, 'negative_mark_per_wrong' => 0.25, 'max_attempts' => 1, 'status' => 'published',
    ], $cookie, $csrf), 200, 'Admin publishes examination after questions are ready');
    $adminExamDetail = expect_status(api_request($base, '/api/exams.php?action=detail&id=' . $examId, 'GET', null, $cookie), 200, 'Exam manager can inspect answer keys');
    check(count($adminExamDetail['data']['questions'] ?? []) === 3 && array_key_exists('correct_option_index', $adminExamDetail['data']['questions'][0]), 'Exam manager did not receive the complete question answer key.');
    check((int)($adminExamDetail['data']['questions'][2]['question_bank_item_id'] ?? 0) === $questionBankId, 'Exam detail did not retain the reusable question bank source link.');

    expect_status(api_request($base, '/api/categories.php?action=delete&id=' . $categoryId, 'POST', [], $cookie, $csrf), 409, 'Category linked to a course cannot be deleted');

    $contentResponse = expect_status(api_request($base, '/api/content.php?action=create', 'POST', [
        'title' => 'Reusable API Lesson', 'content_type' => 'lesson', 'body' => 'Integration lesson body', 'status' => 'published',
    ], $cookie, $csrf), 201, 'Admin creates reusable lesson');

    $contentId = (int)$contentResponse['data']['id'];
    $pdfFixture = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF";
    $mediaUpload = expect_status(api_upload_request($base, $contentId, 'lesson-notes.pdf', 'application/pdf', $pdfFixture, $cookie, $csrf), 201, 'Admin uploads private course media');
    $mediaAssetId = (int)$mediaUpload['data']['id'];
    check(($mediaUpload['data']['mime_type'] ?? '') === 'application/pdf', 'Media upload did not retain the detected MIME type.');
    check(($mediaUpload['data']['download_url'] ?? '') === '/api/media.php?action=download&id=' . $mediaAssetId, 'Media upload returned an unexpected download route.');
    $mediaList = expect_status(api_request($base, '/api/media.php?action=list&content_id=' . $contentId, 'GET', null, $cookie), 200, 'Admin lists private media for content');
    check(count($mediaList['data'] ?? []) === 1 && (int)$mediaList['data'][0]['id'] === $mediaAssetId, 'Private media list did not return the uploaded asset.');
    $mediaDownload = api_request($base, '/api/media.php?action=download&id=' . $mediaAssetId, 'GET', null, $cookie);
    expect_raw_status($mediaDownload, 200, 'Authorized admin downloads private media');
    check(in_array('Content-Type: application/pdf', $mediaDownload['headers'], true), 'Private media download did not send its stored MIME type.');
    $rangeDownload = api_request($base, '/api/media.php?action=download&id=' . $mediaAssetId, 'GET', null, $cookie, null, ['Range: bytes=0-4']);
    expect_raw_status($rangeDownload, 206, 'Authorized media download supports byte ranges');
    check(in_array('Content-Range: bytes 0-4/' . strlen($pdfFixture), $rangeDownload['headers'], true), 'Private media byte-range response has an incorrect Content-Range header.');
    expect_status(api_request($base, '/api/content.php?action=delete&id=' . $contentId, 'POST', [], $cookie, $csrf), 200, 'Admin soft-deletes reusable content');
    $contentRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle bin lists deleted learning content');
    check(count(array_filter($contentRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'content' && (int)$row['entity_id'] === $contentId)) === 1, 'Deleted content was not registered in recycle bin.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=permanent_delete&id=' . (int)array_values(array_filter($contentRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'content' && (int)$row['entity_id'] === $contentId))[0]['id'], 'POST', [], $cookie, $csrf), 409, 'Content with private media cannot be permanently deleted');
    $contentRecycleItem = array_values(array_filter($contentRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'content' && (int)$row['entity_id'] === $contentId))[0];
    expect_status(api_request($base, '/api/recycle_bin.php?action=restore&id=' . (int)$contentRecycleItem['id'], 'POST', [], $cookie, $csrf), 200, 'Admin restores learning content from recycle bin');
    $anonymousMediaCookie = null;
    $anonymousDownload = api_request($base, '/api/media.php?action=download&id=' . $mediaAssetId, 'GET', null, $anonymousMediaCookie);
    expect_status($anonymousDownload, 401, 'Anonymous visitor cannot download private course media');
    $invalidMediaUpload = api_upload_request($base, $contentId, 'notes.txt', 'text/plain', 'not an allowed media type', $cookie, $csrf);
    expect_status($invalidMediaUpload, 415, 'Unsupported media type is rejected');
    $syncedLinks = expect_status(api_request($base, '/api/content.php?action=sync_links', 'POST', [
        'content_item_id' => $contentId,
        'links' => [
            ['course_id' => $courseIds[0], 'sort_order' => 0, 'is_preview' => false],
            ['course_id' => $courseIds[1], 'sort_order' => 0, 'is_preview' => true],
        ],
    ], $cookie, $csrf), 200, 'Reusable lesson linked to multiple courses atomically');
    check((int)($syncedLinks['data']['linked_courses'] ?? 0) === 2, 'Bulk course link synchronization did not save both course links.');
    $readLinks = expect_status(api_request($base, '/api/content.php?action=links&id=' . $contentId, 'GET', null, $cookie), 200, 'Admin reads reusable lesson course links');
    check(count($readLinks['data'] ?? []) === 2, 'Reusable lesson link listing did not return both course links.');
    expect_status(api_request($base, '/api/content.php?action=sync_links', 'POST', [
        'content_item_id' => $contentId,
        'links' => [
            ['course_id' => $courseIds[0], 'sort_order' => 0, 'is_preview' => false],
            ['course_id' => $courseIds[0], 'sort_order' => 1, 'is_preview' => true],
        ],
    ], $cookie, $csrf), 422, 'Duplicate course links are rejected without replacing existing links');
    $draftCoursePreview = expect_status(api_request($base, '/api/content.php?action=create', 'POST', [
        'title' => 'Draft course preview must stay private', 'content_type' => 'lesson', 'body' => 'This preview belongs to an unpublished course.', 'status' => 'published',
    ], $cookie, $csrf), 201, 'Admin creates a published lesson for a draft course preview test');
    $draftCoursePreviewContentId = (int)$draftCoursePreview['data']['id'];
    expect_status(api_request($base, '/api/content.php?action=sync_links', 'POST', [
        'content_item_id' => $draftCoursePreviewContentId,
        'links' => [['course_id' => $draftCourseId, 'sort_order' => 0, 'is_preview' => true]],
    ], $cookie, $csrf), 200, 'Admin links preview lesson to an unpublished course');
    $paidContent = expect_status(api_request($base, '/api/content.php?action=create', 'POST', [
        'title' => 'Paid-only API Lesson', 'content_type' => 'lesson', 'body' => 'Private paid lesson body', 'status' => 'published',
    ], $cookie, $csrf), 201, 'Admin creates paid-only lesson');
    $paidContentId = (int)$paidContent['data']['id'];
    expect_status(api_request($base, '/api/content.php?action=attach', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'sort_order' => 1, 'is_preview' => false,
    ], $cookie, $csrf), 200, 'Paid-only lesson linked to first course');
    $detail = expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[0], 'GET', null, $cookie), 200, 'Course manager can view full published course content');
    check(count($detail['data']['content'] ?? []) === 2, 'Course manager did not receive all published course lessons; returned=' . json_encode($detail['data']['content'] ?? []));
    $previewDetail = expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[1], 'GET', null, $cookie), 200, 'Course manager can view preview course content');
    check(count($previewDetail['data']['content'] ?? []) === 1, 'Course manager did not receive the preview lesson.');
    expect_status(api_request($base, '/api/enrollments.php?action=list', 'GET', null, $cookie), 200, 'Admin can list enrollments');

    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Admin logout');
    $cookie = null;
    $branchManagerLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $branchManagerEmail, 'password' => $branchManagerPassword], $cookie), 200, 'Branch manager login');
    $initialBranchUsers = expect_status(api_request($base, '/api/users.php?action=list', 'GET', null, $cookie), 200, 'Branch manager receives only the assigned-branch user directory');
    check(count($initialBranchUsers['data'] ?? []) > 0 && count(array_filter($initialBranchUsers['data'], static fn(array $row): bool => (int)$row['branch_id'] !== $branchId)) === 0, 'Branch manager user directory included another branch.');
    expect_status(api_request($base, '/api/admissions.php?action=list', 'GET', null, $cookie), 403, 'Branch manager cannot access the global admission inbox without scoped permission');
    $branchManagerLegacyCsrf = $branchManagerLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/courses.php?action=list', 'GET', null, $cookie), 200, 'Branch manager can list only branch-scoped courses');
    expect_status(api_request($base, '/api/categories.php?action=list', 'GET', null, $cookie), 200, 'Branch manager can list global and branch-owned categories');
    expect_status(api_request($base, '/api/content.php?action=list', 'GET', null, $cookie), 403, 'Branch manager cannot list globally scoped content');
    expect_status(api_request($base, '/api/enrollments.php?action=list', 'GET', null, $cookie), 200, 'Branch manager can list only branch-scoped enrollments');
    expect_status(api_request($base, '/api/payments.php?action=list', 'GET', null, $cookie), 200, 'Branch manager can list only branch-scoped payments');
    expect_status(api_request($base, '/api/attendance.php?action=list', 'GET', null, $cookie), 200, 'Branch manager can list only branch-scoped attendance');
    expect_status(api_request($base, '/api/certificates.php?action=list', 'GET', null, $cookie), 200, 'Branch manager can list only branch-scoped certificates');
    expect_status(api_request($base, '/api/exams.php?action=create', 'POST', ['title' => 'Forbidden Branch Exam', 'duration_minutes' => 10], $cookie, $branchManagerLegacyCsrf), 403, 'Branch manager cannot manage global exams');
    expect_status(api_request($base, '/api/question_bank.php?action=list', 'GET', null, $cookie), 403, 'Branch manager cannot access the global question bank');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $branchManagerLegacyCsrf), 200, 'Branch manager logout');
    $cookie = null;
    expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $draftCourseId), 404, 'Public visitor cannot open a draft course');
    $publicCourseList = expect_status(api_request($base, '/api/courses.php?action=list'), 200, 'Public course list remains available');
    check(!in_array($draftCourseId, array_map(static fn(array $course): int => (int)$course['id'], $publicCourseList['data'] ?? []), true), 'Public course list exposed a draft course.');
    $publicDetail = expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[0]), 200, 'Public course detail remains available');
    check(count($publicDetail['data']['content'] ?? []) === 0, 'Public visitor received non-preview paid lesson content.');
    $publicPreview = expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[1]), 200, 'Public preview course detail is available');
    check(count($publicPreview['data']['content'] ?? []) === 1, 'Public visitor could not access the explicitly marked preview lesson.');
    expect_status(api_request($base, '/api/content.php?action=detail&id=' . $paidContentId), 404, 'Direct content URL cannot bypass course preview access');
    $publicContentList = expect_status(api_request($base, '/api/content.php?action=list&public=1'), 200, 'Public content list is available');
    check(!in_array($paidContentId, array_map(static fn(array $item): int => (int)$item['id'], $publicContentList['data'] ?? []), true), 'Public content list exposed a paid-only lesson.');
    check(!in_array($draftCoursePreviewContentId, array_map(static fn(array $item): int => (int)$item['id'], $publicContentList['data'] ?? []), true), 'Public content list exposed preview content belonging only to an unpublished course.');
    expect_status(api_request($base, '/api/content.php?action=detail&id=' . $draftCoursePreviewContentId), 404, 'Direct content URL cannot expose preview content belonging only to an unpublished course.');
    $publicPreviewRows = array_values(array_filter($publicContentList['data'] ?? [], static fn(array $item): bool => (int)$item['id'] === $contentId));
    check(count($publicPreviewRows) === 1 && (int)($publicPreviewRows[0]['course_id'] ?? 0) === $courseIds[1] && ($publicPreviewRows[0]['course_title'] ?? '') === 'API Integration Second Course', 'Public preview lesson did not include its safe parent course metadata.');

    $studentLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $studentEmail, 'password' => $studentPassword], $cookie), 200, 'Student login');
    $csrf = $studentLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $draftCourseId, 'GET', null, $cookie), 404, 'Student cannot open a draft course');
    expect_status(api_request($base, '/api/exams.php?action=detail&id=' . $examId, 'GET', null, $cookie), 404, 'Unenrolled student cannot access a course examination');
    $studentExamList = expect_status(api_request($base, '/api/exams.php?action=list', 'GET', null, $cookie), 200, 'Student exam list is available');
    check(!in_array($examId, array_map(static fn(array $item): int => (int)$item['id'], $studentExamList['data'] ?? []), true), 'Student exam list exposed an exam for a course without enrollment.');
    $lockedDetail = expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[0], 'GET', null, $cookie), 200, 'Unenrolled student can view course overview');
    check(count($lockedDetail['data']['content'] ?? []) === 0, 'Unenrolled student received paid lesson content.');
    expect_status(api_request($base, '/api/content.php?action=detail&id=' . $paidContentId, 'GET', null, $cookie), 404, 'Unenrolled student cannot open paid lesson by direct URL');
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'is_completed' => true, 'notes' => 'Unauthorized progress',
    ], $cookie, $csrf), 403, 'Unenrolled student cannot save course progress');
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'notes' => 'Missing completion flag',
    ], $cookie, $csrf), 422, 'Progress update requires an explicit completion value');
    expect_status(api_request($base, '/api/courses.php?action=create', 'POST', $coursePayload, $cookie, $csrf), 403, 'Student cannot manage courses');
    expect_status(api_request($base, '/api/categories.php?action=create', 'POST', ['name' => 'Forbidden Category', 'slug' => 'forbidden-category-' . $suffix], $cookie, $csrf), 403, 'Student cannot manage categories');
    expect_status(api_request($base, '/api/payments.php?action=submit', 'POST', [
        'course_id' => $courseIds[0], 'amount' => '0', 'method' => 'bKash', 'trx_id' => "ZERO-{$suffix}",
    ], $cookie, $csrf), 422, 'Zero payment amount is rejected');
    expect_status(api_request($base, '/api/payments.php?action=submit', 'POST', [
        'course_id' => $courseIds[0], 'amount' => '1000.01', 'method' => 'bKash', 'trx_id' => "OVER-{$suffix}",
    ], $cookie, $csrf), 422, 'Payment above course fee is rejected');
    $payment = expect_status(api_request($base, '/api/payments.php?action=submit', 'POST', [
        'course_id' => $courseIds[0], 'amount' => '1000.00', 'method' => 'bKash', 'trx_id' => "AEC-{$suffix}",
    ], $cookie, $csrf), 201, 'Student submits valid course payment');
    $paymentId = (int)$payment['data']['id'];
    expect_status(api_request($base, '/api/payments.php?action=submit', 'POST', [
        'course_id' => $courseIds[1], 'amount' => '1.00', 'method' => 'bKash', 'trx_id' => "AEC-{$suffix}",
    ], $cookie, $csrf), 409, 'Duplicate payment transaction reference is rejected');
    expect_status(api_request($base, '/api/payments.php?action=list', 'GET', null, $cookie), 403, 'Student cannot view admin payment queue');

    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Student logout');
    $cookie = null;
    $adminLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $cookie), 200, 'Admin re-login');
    $csrf = $adminLogin['data']['csrf_token'] ?? null;
    $commissionAssignment = expect_status(api_request($base, '/api/teacher_commissions.php?action=assign', 'POST', [
        'course_id' => $courseIds[0], 'teacher_user_id' => $teacherId, 'commission_percentage' => 60,
    ], $cookie, $csrf), 200, 'Admin assigns teacher and commission rate before payment verification');
    $commissionAssignmentId = (int)$commissionAssignment['data']['id'];
    $verified = expect_status(api_request($base, '/api/payments.php?action=verify&id=' . $paymentId, 'POST', [], $cookie, $csrf), 200, 'Admin verifies payment');
    check(($verified['data']['course_access_activated'] ?? false) === true, 'Full verified payment did not activate course access.');

    // Persistent batch and weekly routine workflow.
    $batch = expect_status(api_request($base, '/api/batches.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'name' => 'API Integration Batch ' . $suffix,
        'batch_code' => 'TST-' . strtoupper($suffix), 'schedule' => 'Sun 10:00-11:00',
        'room_number' => 'Test Room 1', 'instructor_user_id' => $teacherId, 'max_capacity' => 1,
        'start_date' => '2026-11-15', 'end_date' => '2027-03-01', 'status' => 'upcoming',
    ], $cookie, $csrf), 201, 'Admin creates a persistent academic batch');
    $batchId = (int)$batch['data']['id'];
    expect_status(api_request($base, '/api/batches.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'name' => 'Duplicate API Integration Batch ' . $suffix,
        'batch_code' => 'TST-' . strtoupper($suffix), 'schedule' => 'Sun 10:00-11:00',
        'room_number' => 'Test Room 2', 'instructor_user_id' => $teacherId, 'max_capacity' => 1,
        'start_date' => '2026-11-15', 'end_date' => '2027-03-01', 'status' => 'upcoming',
    ], $cookie, $csrf), 409, 'Batch code uniqueness is enforced within the branch');
    $eligibleBatchStudents = expect_status(api_request($base, '/api/batches.php?action=eligible_students&batch_id=' . $batchId, 'GET', null, $cookie), 200, 'Admin loads students eligible for batch placement');
    check(count(array_filter($eligibleBatchStudents['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $studentId)) === 1, 'Eligible student directory omitted the active course enrollee.');
    $routine = expect_status(api_request($base, '/api/batches.php?action=create_routine', 'POST', [
        'batch_id' => $batchId, 'day_of_week' => 'Sunday', 'start_time' => '10:00', 'end_time' => '11:00',
        'subject' => 'Grammar Practice', 'room_number' => 'Test Room 1', 'instructor_user_id' => $teacherId,
    ], $cookie, $csrf), 201, 'Admin creates a weekly class routine slot');
    $routineId = (int)$routine['data']['id'];
    expect_status(api_request($base, '/api/batches.php?action=create_routine', 'POST', [
        'batch_id' => $batchId, 'day_of_week' => 'Sunday', 'start_time' => '10:30', 'end_time' => '11:30',
        'subject' => 'Overlapping Grammar', 'room_number' => 'Test Room 2', 'instructor_user_id' => $teacherId,
    ], $cookie, $csrf), 409, 'Routine scheduler rejects overlapping instructor bookings');
    expect_status(api_request($base, '/api/batches.php?action=enroll&id=' . $batchId, 'POST', [
        'student_user_id' => $studentId,
    ], $cookie, $csrf), 201, 'Admin enrolls an already-enrolled student into the batch');
    $eligibleAfterPlacement = expect_status(api_request($base, '/api/batches.php?action=eligible_students&batch_id=' . $batchId, 'GET', null, $cookie), 200, 'Eligible student directory refreshes after placement');
    check(!in_array($studentId, array_map(static fn(array $row): int => (int)$row['id'], $eligibleAfterPlacement['data'] ?? []), true), 'Already-placed student remained in the eligible student directory.');
    $batchStudents = expect_status(api_request($base, '/api/batches.php?action=students&batch_id=' . $batchId, 'GET', null, $cookie), 200, 'Admin views batch student roster');
    check(count($batchStudents['data'] ?? []) === 1 && (int)$batchStudents['data'][0]['user_id'] === $studentId, 'Batch roster did not include the enrolled student.');
    $studentBatches = expect_status(api_request($base, '/api/batches.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student views own assigned batches');
    check(in_array($batchId, array_map(static fn(array $row): int => (int)$row['id'], $studentBatches['data'] ?? []), true), 'Student could not see their assigned batch.');
    $studentRoutines = expect_status(api_request($base, '/api/batches.php?action=routines', 'GET', null, $notificationStudentCookie), 200, 'Student views own batch routine');
    check(count(array_filter($studentRoutines['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $routineId)) === 1, 'Student could not see their assigned routine.');
    expect_status(api_request($base, '/api/batches.php?action=delete&id=' . $batchId, 'POST', [], $cookie, $csrf), 200, 'Admin soft-deletes a batch');
    $batchRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle bin lists deleted academic batches');
    $batchRecycleItem = array_values(array_filter($batchRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'batch' && (int)$row['entity_id'] === $batchId))[0] ?? null;
    check(is_array($batchRecycleItem), 'Deleted batch was not registered in recycle bin.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=permanent_delete&id=' . (int)$batchRecycleItem['id'], 'POST', [], $cookie, $csrf), 409, 'Batch with student and routine history cannot be permanently deleted');
    $studentBatchesAfterDelete = expect_status(api_request($base, '/api/batches.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student batch list hides deleted batches');
    check(!in_array($batchId, array_map(static fn(array $row): int => (int)$row['id'], $studentBatchesAfterDelete['data'] ?? []), true), 'Deleted batch remained visible to students.');
    expect_status(api_request($base, '/api/batches.php?action=restore&id=' . $batchId, 'POST', [], $cookie, $csrf), 200, 'Admin restores a batch');
    $studentRoutinesAfterRestore = expect_status(api_request($base, '/api/batches.php?action=routines', 'GET', null, $notificationStudentCookie), 200, 'Student can view the routine after batch restoration');
    check(count(array_filter($studentRoutinesAfterRestore['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $routineId)) === 1, 'Restoring a batch did not restore its routine visibility.');
    expect_status(api_request($base, '/api/batches.php?action=delete&id=' . $batchId, 'POST', [], $cookie, $csrf), 200, 'Admin deletes batch again for central restore test');
    $batchRecycleAgain = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle bin lists second batch deletion');
    $batchRecycleAgainItem = array_values(array_filter($batchRecycleAgain['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'batch' && (int)$row['entity_id'] === $batchId))[0] ?? null;
    check(is_array($batchRecycleAgainItem), 'Second batch deletion did not create a recycle-bin item.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=restore&id=' . (int)$batchRecycleAgainItem['id'], 'POST', [], $cookie, $csrf), 200, 'Admin restores batch through central recycle-bin API');
    $batchUpdateBase = [
        'course_id' => $courseIds[0], 'name' => 'API Integration Batch ' . $suffix,
        'batch_code' => 'TST-' . strtoupper($suffix), 'schedule' => 'Sun 10:00-11:00',
        'room_number' => 'Test Room 1', 'instructor_user_id' => $teacherId, 'max_capacity' => 1,
        'start_date' => '2026-11-15', 'end_date' => '2027-03-01',
    ];
    expect_status(api_request($base, '/api/batches.php?action=update&id=' . $batchId, 'POST', $batchUpdateBase + ['status' => 'cancelled'], $cookie, $csrf), 200, 'Admin cancels a batch');
    $studentBatchesAfterCancel = expect_status(api_request($base, '/api/batches.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Cancelled batch is hidden from students');
    check(!in_array($batchId, array_map(static fn(array $row): int => (int)$row['id'], $studentBatchesAfterCancel['data'] ?? []), true), 'Student retained access to a cancelled batch.');
    $studentRoutinesAfterCancel = expect_status(api_request($base, '/api/batches.php?action=routines', 'GET', null, $notificationStudentCookie), 200, 'Cancelled batch routines are hidden from students');
    check(count(array_filter($studentRoutinesAfterCancel['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $routineId)) === 0, 'Student retained access to a cancelled batch routine.');
    expect_status(api_request($base, '/api/batches.php?action=eligible_students&batch_id=' . $batchId, 'GET', null, $cookie), 409, 'Cancelled batch cannot accept new students');
    expect_status(api_request($base, '/api/batches.php?action=enroll&id=' . $batchId, 'POST', ['student_user_id' => $studentId], $cookie, $csrf), 409, 'Cancelled batch rejects student placement');
    expect_status(api_request($base, '/api/batches.php?action=update&id=' . $batchId, 'POST', $batchUpdateBase + ['status' => 'upcoming'], $cookie, $csrf), 200, 'Admin reopens the batch after cancellation');



    // Persistent teacher commission: verified revenue accrues commission, payout reservations prevent overspending.
    $adminCommissionSummary = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary&teacher_id=' . $teacherId, 'GET', null, $cookie), 200, 'Admin reads teacher commission summary');
    check((float)($adminCommissionSummary['data']['totals']['gross_commission'] ?? 0) === 600.0, 'Commission was not calculated as 60% of verified net course revenue.');
    $teacherCommissionCookie = null;
    $teacherCommissionLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => "api-teacher-{$suffix}@example.test", 'password' => 'TestTeacher!Pass123',
    ], $teacherCommissionCookie), 200, 'Teacher login for commission and payout workflow');
    $teacherCommissionCsrf = $teacherCommissionLogin['data']['csrf_token'] ?? null;
    $teacherCommissionSummary = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary', 'GET', null, $teacherCommissionCookie), 200, 'Teacher reads own commission summary');
    check((float)($teacherCommissionSummary['data']['totals']['available_balance'] ?? 0) === 600.0, 'Teacher available commission balance is incorrect.');
    $payoutRequest = expect_status(api_request($base, '/api/teacher_commissions.php?action=request_payout', 'POST', [
        'amount' => '500.00', 'payout_method' => 'bKash', 'account_reference' => '01700000000',
    ], $teacherCommissionCookie, $teacherCommissionCsrf), 201, 'Teacher requests a payout within available balance');
    $payoutRequestId = (int)$payoutRequest['data']['id'];
    expect_status(api_request($base, '/api/teacher_commissions.php?action=request_payout', 'POST', [
        'amount' => '101.00', 'payout_method' => 'Nagad', 'account_reference' => '01800000000',
    ], $teacherCommissionCookie, $teacherCommissionCsrf), 422, 'Teacher cannot reserve more than remaining commission balance');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $teacherCommissionCookie, $teacherCommissionCsrf), 200, 'Teacher logout after payout request');
    $accountantEmail = "api-accountant-{$suffix}@example.test";
    $insertUser->execute(['API Commission Accountant', $accountantEmail, password_hash('TestAccountant!Pass123', PASSWORD_DEFAULT), 'accountant']);
    $accountantId = (int)$db->lastInsertId();
    $db->prepare('UPDATE users SET branch_id = ? WHERE id = ?')->execute([$branchId, $accountantId]);
    $accountantCookie = null;
    $accountantLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $accountantEmail, 'password' => 'TestAccountant!Pass123',
    ], $accountantCookie), 200, 'Accountant login for teacher payout approvals');
    $accountantCsrf = $accountantLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/teacher_commissions.php?action=summary', 'GET', null, $accountantCookie), 200, 'Accountant reads commission overview');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=payouts', 'GET', null, $accountantCookie), 200, 'Accountant reads payout queue');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=assignments', 'GET', null, $accountantCookie), 403, 'Accountant cannot change teacher commission assignments');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=assign', 'POST', [
        'course_id' => $courseIds[0], 'teacher_user_id' => $teacherId, 'commission_percentage' => 25,
    ], $accountantCookie, $accountantCsrf), 403, 'Accountant cannot set teacher commission rates');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=review_payout&id=' . $payoutRequestId, 'POST', ['decision' => 'approve'], $accountantCookie, $accountantCsrf), 200, 'Accountant approves teacher payout');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=mark_paid&id=' . $payoutRequestId, 'POST', [
        'external_transaction_reference' => 'PAYOUT-' . strtoupper($suffix),
    ], $accountantCookie, $accountantCsrf), 200, 'Accountant records confirmed payout with external transaction reference');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $accountantCookie, $accountantCsrf), 200, 'Accountant logout after payout reconciliation');
    $paidCommissionSummary = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary&teacher_id=' . $teacherId, 'GET', null, $cookie), 200, 'Admin verifies paid commission totals');
    check((float)($paidCommissionSummary['data']['totals']['paid_commission'] ?? 0) === 500.0
        && (float)($paidCommissionSummary['data']['totals']['available_balance'] ?? 0) === 100.0,
        'Paid payout was not reflected in commission totals.');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=unassign&id=' . $commissionAssignmentId, 'POST', [], $cookie, $csrf), 200, 'Admin ends teacher course assignment');
    $historicalCommissionSummary = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary&teacher_id=' . $teacherId, 'GET', null, $cookie), 200, 'Admin reads historical commission after unassignment');
    check((float)($historicalCommissionSummary['data']['totals']['gross_commission'] ?? 0) === 600.0, 'Unassigning a teacher erased commission earned while the assignment was active.');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=assign', 'POST', [
        'course_id' => $courseIds[0], 'teacher_user_id' => $teacherId, 'commission_percentage' => 40,
    ], $cookie, $csrf), 200, 'Admin reassigns the teacher with a new commission period');
    $reassignedSummary = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary&teacher_id=' . $teacherId, 'GET', null, $cookie), 200, 'Admin verifies re-assignment preserves earlier earnings');
    check((float)($reassignedSummary['data']['totals']['gross_commission'] ?? 0) === 600.0, 'Reassigning a teacher overwrote the previous commission period.');
    $teacherAfterReassignCookie = null;
    $teacherAfterReassignLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => "api-teacher-{$suffix}@example.test", 'password' => 'TestTeacher!Pass123',
    ], $teacherAfterReassignCookie), 200, 'Teacher re-login for second payout reservation');
    $teacherAfterReassignCsrf = $teacherAfterReassignLogin['data']['csrf_token'] ?? null;
    $secondPayout = expect_status(api_request($base, '/api/teacher_commissions.php?action=request_payout', 'POST', [
        'amount' => '80.00', 'payout_method' => 'Nagad', 'account_reference' => '01800000000',
    ], $teacherAfterReassignCookie, $teacherAfterReassignCsrf), 201, 'Teacher reserves a second payout before refund adjustment');
    $secondPayoutRequestId = (int)$secondPayout['data']['id'];
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $teacherAfterReassignCookie, $teacherAfterReassignCsrf), 200, 'Teacher logout after second payout reservation');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=assignments', 'GET', null, $branchManagerCookie), 403, 'Branch manager cannot use unscoped commission assignment management');
    $studentInboxAfterPayment = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student receives payment verification notification');
    check(count(array_filter($studentInboxAfterPayment['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'Payment verified')) === 1, 'Payment verification did not notify the student.');
    $branchPayments = expect_status(api_request($base, '/api/payments.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager reloads branch payment queue');
    check(in_array($paymentId, array_map(static fn(array $row): int => (int)$row['id'], $branchPayments['data'] ?? []), true), 'Branch manager could not see the payment belonging to its branch.');
    $branchEnrollments = expect_status(api_request($base, '/api/enrollments.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager reloads branch enrollment list');
    check(count(array_filter($branchEnrollments['data'] ?? [], static fn(array $row): bool => (int)$row['user_id'] === $studentId && (int)$row['course_id'] === $courseIds[0])) === 1, 'Branch manager could not see the enrollment belonging to its branch.');
    expect_status(api_request($base, '/api/courses.php?action=delete&id=' . $draftCourseId, 'POST', [], $cookie, $csrf), 200, 'Admin archives a course through the API');
    $courseRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Admin lists persistent recycle-bin items after course deletion');
    check(count(array_filter($courseRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'course' && (int)$row['entity_id'] === $draftCourseId)) === 1, 'Soft-deleted course was not registered in the persistent recycle bin.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $notificationStudentCookie), 403, 'Student cannot access administrator recycle bin');
    $branchRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager can view assigned-branch recycle-bin items');
    check(count(array_filter($branchRecycleItems['data'] ?? [], static fn(array $row): bool => $row['branch_id'] !== null && (int)$row['branch_id'] !== $branchId)) === 0, 'Branch manager recycle bin leaked another branch records.');
    $courseRecycleItem = array_values(array_filter($courseRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'course' && (int)$row['entity_id'] === $draftCourseId))[0];
    expect_status(api_request($base, '/api/recycle_bin.php?action=permanent_delete&id=' . (int)$courseRecycleItem['id'], 'POST', [], $cookie, $csrf), 409, 'Course with enrollment/payment history cannot be permanently deleted');
    $afterArchive = expect_status(api_request($base, '/api/courses.php?action=list', 'GET', null, $cookie), 200, 'Admin course list after archival');
    check(!in_array($draftCourseId, array_map(static fn(array $course): int => (int)$course['id'], $afterArchive['data'] ?? []), true), 'Archived course remained in the active course list.');
    expect_status(api_request($base, '/api/courses.php?action=restore&id=' . $draftCourseId, 'POST', [], $cookie, $csrf), 200, 'Admin restores archived course');
    $afterRestore = expect_status(api_request($base, '/api/courses.php?action=list', 'GET', null, $cookie), 200, 'Admin course list after restoration');
    check(in_array($draftCourseId, array_map(static fn(array $course): int => (int)$course['id'], $afterRestore['data'] ?? []), true), 'Restored course was not returned to the active course list.');
    $recycleAfterCourseRestore = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $cookie), 200, 'Recycle bin refreshes after direct course restore');
    check(!in_array($draftCourseId, array_map(static fn(array $row): int => (int)$row['entity_id'], array_filter($recycleAfterCourseRestore['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'course')), true), 'Direct course restore left an active recycle-bin item.');
    expect_status(api_request($base, '/api/payments.php?action=verify&id=' . $paymentId, 'POST', [], $cookie, $csrf), 409, 'Payment cannot be verified twice');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Admin logout after payment review');
    $cookie = null;
    $studentLoginAfterPayment = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $studentEmail, 'password' => $studentPassword], $cookie), 200, 'Student re-login after payment verification');
    $csrf = $studentLoginAfterPayment['data']['csrf_token'] ?? null;
    $unlockedDetail = expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[0], 'GET', null, $cookie), 200, 'Paid student can access enrolled course lessons');
    check(count($unlockedDetail['data']['content'] ?? []) === 2, 'Active enrollment did not unlock the full course lessons.');
    expect_status(api_request($base, '/api/content.php?action=detail&id=' . $paidContentId, 'GET', null, $cookie), 200, 'Active enrollment can open paid lesson by direct URL');
    $attendanceDate = date('Y-m-d');
    $studentAttendanceBefore = expect_status(api_request($base, '/api/attendance.php?action=my', 'GET', null, $cookie), 200, 'Student can read own attendance history');
    check(count($studentAttendanceBefore['data'] ?? []) === 0, 'Student should not have attendance before the first roll call.');
    expect_status(api_request($base, '/api/attendance.php?action=save', 'POST', [
        'course_id' => $courseIds[0], 'attendance_date' => $attendanceDate,
        'records' => [['user_id' => $studentId, 'status' => 'present']],
    ], $cookie, $csrf), 403, 'Student cannot mark attendance');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Student logout before admin attendance entry');
    $cookie = null;
    $adminAttendanceLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $cookie), 200, 'Admin login for attendance register');
    $csrf = $adminAttendanceLogin['data']['csrf_token'] ?? null;
    $attendanceRoster = expect_status(api_request($base, '/api/attendance.php?action=roster&course_id=' . $courseIds[0] . '&date=' . $attendanceDate, 'GET', null, $cookie), 200, 'Admin loads enrolled student attendance roster');
    check(count($attendanceRoster['data'] ?? []) === 1 && (int)$attendanceRoster['data'][0]['id'] === $studentId, 'Attendance roster must contain only the enrolled student.');
    expect_status(api_request($base, '/api/attendance.php?action=save', 'POST', [
        'course_id' => $courseIds[0], 'attendance_date' => $attendanceDate,
        'records' => [['user_id' => $studentId, 'status' => 'holiday']],
    ], $cookie, $csrf), 422, 'Attendance API rejects unknown status values');
    expect_status(api_request($base, '/api/attendance.php?action=save', 'POST', [
        'course_id' => $courseIds[0], 'attendance_date' => '2026-02-30',
        'records' => [['user_id' => $studentId, 'status' => 'present']],
    ], $cookie, $csrf), 422, 'Attendance API rejects invalid calendar dates');
    expect_status(api_request($base, '/api/attendance.php?action=save', 'POST', [
        'course_id' => $courseIds[0], 'attendance_date' => $attendanceDate,
        'records' => [['user_id' => $studentId, 'status' => 'present', 'remarks' => 'Present at roll call']],
    ], $cookie, $csrf), 200, 'Admin records student attendance');
    expect_status(api_request($base, '/api/attendance.php?action=save', 'POST', [
        'course_id' => $courseIds[0], 'attendance_date' => $attendanceDate,
        'records' => [['user_id' => $studentId, 'status' => 'late', 'remarks' => 'Arrived ten minutes late']],
    ], $cookie, $csrf), 200, 'Admin updates same-day attendance without creating a duplicate');
    $attendanceRosterAfter = expect_status(api_request($base, '/api/attendance.php?action=roster&course_id=' . $courseIds[0] . '&date=' . $attendanceDate, 'GET', null, $cookie), 200, 'Admin reloads saved attendance roster');
    check(($attendanceRosterAfter['data'][0]['status'] ?? '') === 'late', 'Attendance upsert did not update the existing status.');
    $branchAttendance = expect_status(api_request($base, '/api/attendance.php?action=list&date=' . $attendanceDate, 'GET', null, $branchManagerCookie), 200, 'Branch manager reloads branch attendance records');
    check(count(array_filter($branchAttendance['data'] ?? [], static fn(array $row): bool => (int)$row['user_id'] === $studentId && (int)$row['course_id'] === $courseIds[0])) === 1, 'Branch manager attendance list leaked or omitted branch records.');
    $branchRoster = expect_status(api_request($base, '/api/attendance.php?action=roster&course_id=' . $courseIds[0] . '&date=' . $attendanceDate, 'GET', null, $branchManagerCookie), 200, 'Branch manager loads only its branch attendance roster');
    check(count($branchRoster['data'] ?? []) === 1 && (int)$branchRoster['data'][0]['id'] === $studentId, 'Branch manager roster returned a student outside its branch.');
    check(($attendanceRosterAfter['data'][0]['remarks'] ?? '') === 'Arrived ten minutes late', 'Attendance remarks were not persisted.');
    $attendanceList = expect_status(api_request($base, '/api/attendance.php?action=list&course_id=' . $courseIds[0] . '&date=' . $attendanceDate, 'GET', null, $cookie), 200, 'Admin lists saved attendance records');
    check(count($attendanceList['data'] ?? []) === 1, 'Unique course/student/date attendance record was duplicated.');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Admin logout after attendance entry');
    $cookie = null;
    $studentAttendanceLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $studentEmail, 'password' => $studentPassword], $cookie), 200, 'Student login to verify attendance history');
    $csrf = $studentAttendanceLogin['data']['csrf_token'] ?? null;
    $studentAttendanceAfter = expect_status(api_request($base, '/api/attendance.php?action=my', 'GET', null, $cookie), 200, 'Student reloads own attendance history');
    check(count($studentAttendanceAfter['data'] ?? []) === 1 && ($studentAttendanceAfter['data'][0]['status'] ?? '') === 'late', 'Student attendance history did not return the saved record.');


    $availableExam = expect_status(api_request($base, '/api/exams.php?action=detail&id=' . $examId, 'GET', null, $cookie), 200, 'Enrolled student can open course examination');
    check(count($availableExam['data']['questions'] ?? []) === 3, 'Student exam detail did not return the question list.');
    check(!array_key_exists('correct_option_index', $availableExam['data']['questions'][0]) && !array_key_exists('explanation', $availableExam['data']['questions'][0]), 'Student exam detail leaked correct answers before submission.');
    $startedAttempt = expect_status(api_request($base, '/api/exams.php?action=start&id=' . $examId, 'POST', [], $cookie, $csrf), 200, 'Enrolled student starts timed exam');
    $attemptId = (int)$startedAttempt['data']['attempt']['id'];
    $examQuestionIds = array_map(static fn(array $question): string => (string)$question['id'], $availableExam['data']['questions']);
    expect_status(api_request($base, '/api/exams.php?action=save_answers&id=' . $attemptId, 'POST', [
        'answers' => [$examQuestionIds[0] => 99],
    ], $cookie, $csrf), 422, 'Invalid answer option index is rejected');
    expect_status(api_request($base, '/api/exams.php?action=save_answers&id=' . $attemptId, 'POST', [
        'answers' => [$examQuestionIds[0] => 1],
    ], $cookie, $csrf), 200, 'Student autosaves an in-progress exam answer');
    $resumedAttempt = expect_status(api_request($base, '/api/exams.php?action=start&id=' . $examId, 'POST', [], $cookie, $csrf), 200, 'Student resumes the existing in-progress attempt');
    check((int)$resumedAttempt['data']['attempt']['id'] === $attemptId && (int)($resumedAttempt['data']['attempt']['answers'][$examQuestionIds[0]] ?? -1) === 1, 'Exam resume did not restore the saved answer.');
    $examResult = expect_status(api_request($base, '/api/exams.php?action=submit&id=' . $attemptId, 'POST', [
        'answers' => [$examQuestionIds[0] => 1, $examQuestionIds[1] => 1, $examQuestionIds[2] => 0],
    ], $cookie, $csrf), 200, 'Server grades submitted examination');
    check((float)$examResult['data']['score'] === 2.75 && (float)$examResult['data']['total_marks'] === 5.0, 'Exam score or negative marking was calculated incorrectly.');
    check((float)$examResult['data']['percentage'] === 55.0 && ($examResult['data']['passed'] ?? false) === true, 'Exam percentage or pass threshold was calculated incorrectly.');
    check(array_key_exists('correct_option_index', $examResult['data']['review'][0]), 'Submitted exam review did not reveal the correct answer.');
    expect_status(api_request($base, '/api/exams.php?action=submit&id=' . $attemptId, 'POST', ['answers' => []], $cookie, $csrf), 409, 'Exam attempt cannot be submitted twice');
    expect_status(api_request($base, '/api/exams.php?action=start&id=' . $examId, 'POST', [], $cookie, $csrf), 409, 'Student cannot exceed the maximum number of exam attempts');
    $studentAttempts = expect_status(api_request($base, '/api/exams.php?action=attempts&exam_id=' . $examId, 'GET', null, $cookie), 200, 'Student can view own exam attempt history');
    check(count($studentAttempts['data'] ?? []) === 1 && (int)$studentAttempts['data'][0]['id'] === $attemptId, 'Student attempt history did not return the submitted attempt.');
    $examAdminCookie = null;
    $examAdminLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $adminEmail, 'password' => $adminPassword,
    ], $examAdminCookie), 200, 'Admin re-login to manage exam recycle-bin records');
    $examAdminCsrf = $examAdminLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/exams.php?action=delete&id=' . $examId, 'POST', [], $examAdminCookie, $examAdminCsrf), 409, 'Exam with student attempts cannot be archived or permanently removed');
    $recycleExam = expect_status(api_request($base, '/api/exams.php?action=create', 'POST', [
        'course_id' => $courseIds[0], 'title' => 'Recycle Bin Draft Exam', 'duration_minutes' => 10,
        'pass_marks' => 0, 'negative_mark_per_wrong' => 0, 'max_attempts' => 1, 'status' => 'draft',
    ], $examAdminCookie, $examAdminCsrf), 201, 'Admin creates an exam for recycle-bin restore test');
    $recycleExamId = (int)$recycleExam['data']['id'];
    expect_status(api_request($base, '/api/exams.php?action=delete&id=' . $recycleExamId, 'POST', [], $examAdminCookie, $examAdminCsrf), 200, 'Admin archives an exam into recycle bin');
    $examRecycleItems = expect_status(api_request($base, '/api/recycle_bin.php?action=list', 'GET', null, $examAdminCookie), 200, 'Recycle bin lists archived exams');
    $examRecycleItem = array_values(array_filter($examRecycleItems['data'] ?? [], static fn(array $row): bool => ($row['entity_type'] ?? '') === 'exam' && (int)$row['entity_id'] === $recycleExamId))[0] ?? null;
    check(is_array($examRecycleItem), 'Archived exam was not registered in recycle bin.');
    expect_status(api_request($base, '/api/recycle_bin.php?action=restore&id=' . (int)$examRecycleItem['id'], 'POST', [], $examAdminCookie, $examAdminCsrf), 200, 'Admin restores a draft exam from recycle bin');
    $restoredExam = expect_status(api_request($base, '/api/exams.php?action=detail&id=' . $recycleExamId, 'GET', null, $examAdminCookie), 200, 'Restored exam is available to administrators');
    check(($restoredExam['data']['status'] ?? '') === 'draft', 'Restored exam did not recover its original draft status.');

    $studentMarksheetWallet = expect_status(api_request($base, '/api/marksheets.php?action=list', 'GET', null, $cookie), 200, 'Student loads own persistent marksheet wallet');
    check(count($studentMarksheetWallet['data'] ?? []) === 0, 'A marksheet must not be fabricated before an administrator issues it.');
    expect_status(api_request($base, '/api/marksheets.php?action=issue', 'POST', ['attempt_id' => $attemptId], $cookie, $csrf), 403, 'Student cannot issue an official marksheet');
    expect_status(api_request($base, '/api/marksheets.php?action=eligible_attempts', 'GET', null, $cookie), 403, 'Student cannot access the marksheet issuance queue');
    expect_status(api_request($base, '/api/marksheets.php?action=eligible_attempts', 'GET', null, $branchManagerCookie), 403, 'Branch manager cannot access the global marksheet issuance queue');
    expect_status(api_request($base, '/api/marksheets.php?action=issue', 'POST', ['attempt_id' => $attemptId], $branchManagerCookie, $branchManagerCsrf), 403, 'Branch manager cannot issue marksheets without branch-scoped authorization');

    $marksheetAdminCookie = null;
    $marksheetAdminLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $marksheetAdminCookie), 200, 'Admin login for marksheet issuance');
    $marksheetAdminCsrf = $marksheetAdminLogin['data']['csrf_token'] ?? null;
    $eligibleMarksheetAttempts = expect_status(api_request($base, '/api/marksheets.php?action=eligible_attempts', 'GET', null, $marksheetAdminCookie), 200, 'Admin loads submitted attempts eligible for marksheets');
    check(in_array($attemptId, array_map(static fn(array $row): int => (int)$row['attempt_id'], $eligibleMarksheetAttempts['data'] ?? []), true), 'Submitted exam attempt is missing from marksheet issuance queue.');
    $issuedMarksheet = expect_status(api_request($base, '/api/marksheets.php?action=issue', 'POST', ['attempt_id' => $attemptId, 'score' => 1000, 'total_marks' => 1000, 'percentage' => 100, 'grade' => 'A+', 'student_user_id' => $adminId], $marksheetAdminCookie, $marksheetAdminCsrf), 201, 'Admin issues marksheet from server-scored attempt and ignores forged client result fields');
    $marksheetId = (int)$issuedMarksheet['data']['id'];
    check((string)$issuedMarksheet['data']['marksheet_number'] !== '', 'Issued marksheet number must not be empty.');
    expect_status(api_request($base, '/api/marksheets.php?action=issue', 'POST', ['attempt_id' => $attemptId], $marksheetAdminCookie, $marksheetAdminCsrf), 409, 'Duplicate marksheet issuance for the same exam attempt is rejected');
    $adminMarksheetList = expect_status(api_request($base, '/api/marksheets.php?action=list', 'GET', null, $marksheetAdminCookie), 200, 'Admin reloads persistent marksheet registry');
    $storedMarksheet = array_values(array_filter($adminMarksheetList['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $marksheetId));
    check(count($storedMarksheet) === 1 && (float)$storedMarksheet[0]['score'] === 2.75 && (float)$storedMarksheet[0]['total_marks'] === 5.0, 'Marksheet snapshot does not match the verified exam attempt score.');
    check($storedMarksheet[0]['student_email'] === $studentEmail && $storedMarksheet[0]['exam_title'] === 'API Integration MCQ Exam', 'Marksheet identity or exam snapshot is incorrect.');
    $marksheetAudit = $db->prepare("SELECT COUNT(*) FROM audit_logs WHERE user_id = ? AND action = 'marksheet.issued' AND entity_type = 'marksheet' AND entity_id = ?");
    $marksheetAudit->execute([$adminId, $marksheetId]);
    check((int)$marksheetAudit->fetchColumn() === 1, 'Official marksheet issuance did not create its audit log entry.');
    $studentMarksheetWalletAfterIssue = expect_status(api_request($base, '/api/marksheets.php?action=list', 'GET', null, $cookie), 200, 'Student reloads own issued marksheet wallet');
    check(count(array_filter($studentMarksheetWalletAfterIssue['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $marksheetId)) === 1, 'Issued marksheet is not visible in the owning student wallet.');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $marksheetAdminCookie, $marksheetAdminCsrf), 200, 'Admin logout after marksheet issuance checks');
    $emptyProgress = expect_status(api_request($base, '/api/content.php?action=progress&course_id=' . $courseIds[0], 'GET', null, $cookie), 200, 'Enrolled student can load lesson progress');
    check(count($emptyProgress['data'] ?? []) === 0, 'New enrollment should not have pre-existing lesson progress.');
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'is_completed' => true, 'notes' => 'Reviewed the lesson and practised the exercises.',
    ], $cookie, $csrf), 200, 'Enrolled student saves lesson completion and notes');
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'is_completed' => true, 'notes' => ['invalid'],
    ], $cookie, $csrf), 422, 'Non-text lesson notes are rejected');
    $savedProgress = expect_status(api_request($base, '/api/content.php?action=progress&course_id=' . $courseIds[0], 'GET', null, $cookie), 200, 'Enrolled student reloads saved lesson progress');
    check(count($savedProgress['data'] ?? []) === 1, 'Saved lesson progress was not returned exactly once.');
    check((int)$savedProgress['data'][0]['content_item_id'] === $paidContentId && (int)$savedProgress['data'][0]['is_completed'] === 1, 'Saved lesson completion state did not persist.');
    check($savedProgress['data'][0]['notes'] === 'Reviewed the lesson and practised the exercises.', 'Saved personal lesson notes did not persist.');
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'is_completed' => false, 'notes' => 'Updated study notes.',
    ], $cookie, $csrf), 200, 'Student updates existing lesson progress without duplication');
    $progressCount = $db->prepare('SELECT COUNT(*) FROM course_lesson_progress WHERE user_id = ? AND course_id = ? AND content_item_id = ?');
    $progressCount->execute([$studentId, $courseIds[0], $paidContentId]);
    check((int)$progressCount->fetchColumn() === 1, 'Lesson progress upsert created duplicate records.');

    $studentCertificates = expect_status(api_request($base, '/api/certificates.php?action=my', 'GET', null, $cookie), 200, 'Student loads own certificate wallet');
    check(count($studentCertificates['data'] ?? []) === 0, 'New student must not receive demo or fabricated certificates.');
    expect_status(api_request($base, '/api/certificates.php?action=list', 'GET', null, $cookie), 403, 'Student cannot access the certificate administration registry');
    expect_status(api_request($base, '/api/certificates.php?action=issue', 'POST', [
        'student_user_id' => $studentId, 'course_id' => $courseIds[0], 'grade' => 'Completed',
    ], $cookie, $csrf), 403, 'Student cannot issue certificates');

    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Student logout before certificate eligibility review');
    $cookie = null;
    $adminCertificateLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $cookie), 200, 'Admin login for certificate eligibility review');
    $csrf = $adminCertificateLogin['data']['csrf_token'] ?? null;
    $certificateStudents = expect_status(api_request($base, '/api/certificates.php?action=students&q=' . rawurlencode($studentEmail), 'GET', null, $cookie), 200, 'Admin searches active students for certificate issuance');
    check(count($certificateStudents['data'] ?? []) === 1 && (int)$certificateStudents['data'][0]['id'] === $studentId, 'Certificate student search did not return only the matching active student.');
    expect_status(api_request($base, '/api/certificates.php?action=issue', 'POST', [
        'student_user_id' => $studentId, 'course_id' => $courseIds[0], 'grade' => 'Completed',
    ], $cookie, $csrf), 409, 'Admin cannot issue certificate before course completion');

    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Admin logout after certificate eligibility review');
    $cookie = null;
    $studentCertificateLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $studentEmail, 'password' => $studentPassword], $cookie), 200, 'Student login to complete course for certificate');
    $csrf = $studentCertificateLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $paidContentId, 'is_completed' => true, 'notes' => 'Completed the paid lesson.',
    ], $cookie, $csrf), 200, 'Student completes first required course lesson');
    expect_status(api_request($base, '/api/content.php?action=progress_update', 'POST', [
        'course_id' => $courseIds[0], 'content_item_id' => $contentId, 'is_completed' => true, 'notes' => 'Completed the introduction lesson.',
    ], $cookie, $csrf), 200, 'Student completes final required course lesson');
    $completeProgress = expect_status(api_request($base, '/api/content.php?action=progress&course_id=' . $courseIds[0], 'GET', null, $cookie), 200, 'Student confirms all required course lessons completed');
    check(count(array_filter($completeProgress['data'] ?? [], static fn(array $row): bool => (int)$row['is_completed'] === 1)) === 2, 'Course completion prerequisite did not persist for every lesson.');

    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Student logout before certificate issuance');
    $cookie = null;
    $adminCertificateIssueLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $adminEmail, 'password' => $adminPassword], $cookie), 200, 'Admin login to issue course certificate');
    $csrf = $adminCertificateIssueLogin['data']['csrf_token'] ?? null;
    $issuedCertificate = expect_status(api_request($base, '/api/certificates.php?action=issue', 'POST', [
        'student_user_id' => $studentId, 'course_id' => $courseIds[0], 'grade' => 'Completed with Distinction',
    ], $cookie, $csrf), 201, 'Admin issues certificate after verified course completion');
    $certificateId = (int)$issuedCertificate['data']['id'];
    $certificateNumber = (string)$issuedCertificate['data']['certificate_number'];
    $studentInboxAfterCertificate = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student receives certificate issuance notification');
    check(count(array_filter($studentInboxAfterCertificate['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'Certificate issued')) === 1, 'Certificate issuance did not notify the student.');
    $branchCertificates = expect_status(api_request($base, '/api/certificates.php?action=list', 'GET', null, $branchManagerCookie), 200, 'Branch manager reloads branch certificate registry');
    check(in_array($certificateId, array_map(static fn(array $row): int => (int)$row['id'], $branchCertificates['data'] ?? []), true), 'Branch manager could not see the certificate belonging to its branch.');
    check((bool)preg_match('/^AEC-CERT-\\d{4}-[A-F0-9]{32}$/', $certificateNumber), 'Certificate number must be unique and non-guessable.');
    expect_status(api_request($base, '/api/certificates.php?action=issue', 'POST', [
        'student_user_id' => $studentId, 'course_id' => $courseIds[0], 'grade' => 'Duplicate',
    ], $cookie, $csrf), 409, 'Duplicate certificate for the same student and course is rejected');
    $certificateList = expect_status(api_request($base, '/api/certificates.php?action=list', 'GET', null, $cookie), 200, 'Admin reloads persistent certificate registry');
    check(count(array_filter($certificateList['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $certificateId)) === 1, 'Issued certificate was not persisted in the registry.');
    $publicCertificate = expect_status(api_request($base, '/api/certificates.php?action=verify&cert_no=' . rawurlencode($certificateNumber)), 200, 'Public certificate verification lookup');
    check(($publicCertificate['data']['valid'] ?? false) === true && ($publicCertificate['data']['status'] ?? '') === 'issued', 'Public verification did not report the issued certificate as valid.');
    check(!array_key_exists('studentUserId', $publicCertificate['data']) && !array_key_exists('email', $publicCertificate['data']), 'Public certificate verification leaked private account identifiers.');
    expect_status(api_request($base, '/api/certificates.php?action=verify&cert_no=invalid'), 422, 'Public verification rejects malformed certificate numbers');
    expect_status(api_request($base, '/api/certificates.php?action=revoke&id=' . $certificateId, 'POST', ['reason' => ''], $cookie, $csrf), 422, 'Certificate revocation requires an audit reason');
    expect_status(api_request($base, '/api/certificates.php?action=revoke&id=' . $certificateId, 'POST', ['reason' => 'Issued in error during integration test'], $cookie, $csrf), 200, 'Admin revokes certificate with an audit reason');
    $studentInboxAfterRevocation = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student receives certificate revocation notification');
    check(count(array_filter($studentInboxAfterRevocation['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'Certificate revoked')) === 1, 'Certificate revocation did not notify the student.');
    $revokedCertificate = expect_status(api_request($base, '/api/certificates.php?action=verify&cert_no=' . rawurlencode($certificateNumber)), 200, 'Public verification reads revoked certificate status');
    check(($revokedCertificate['data']['valid'] ?? true) === false && ($revokedCertificate['data']['status'] ?? '') === 'revoked', 'Revoked certificate must no longer verify as valid.');
    expect_status(api_request($base, '/api/certificates.php?action=revoke&id=' . $certificateId, 'POST', ['reason' => 'Duplicate revocation'], $cookie, $csrf), 409, 'Certificate cannot be revoked twice');
    expect_status(api_request($base, '/api/auth.php?action=logout', 'POST', [], $cookie, $csrf), 200, 'Admin logout after certificate issuance and revocation');
    $cookie = null;
    $studentCertificateReloadLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', ['email' => $studentEmail, 'password' => $studentPassword], $cookie), 200, 'Student login to reload issued certificate');
    $csrf = $studentCertificateReloadLogin['data']['csrf_token'] ?? null;
    $studentCertificateReload = expect_status(api_request($base, '/api/certificates.php?action=my', 'GET', null, $cookie), 200, 'Student reloads own certificate after issuance');
    check(count($studentCertificateReload['data'] ?? []) === 1 && ($studentCertificateReload['data'][0]['status'] ?? '') === 'revoked', 'Student certificate wallet did not show the revoked credential.');


    $ledger = $db->prepare('SELECT COUNT(*) AS entries, SUM(debit) AS debits, SUM(credit) AS credits FROM ledger_entries e JOIN ledger_transactions t ON t.id = e.transaction_id WHERE t.payment_id = ?');
    $ledger->execute([$paymentId]);
    $totals = $ledger->fetch();
    check((int)$totals['entries'] === 2, 'Verified payment must create exactly two ledger entries.');
    check((float)$totals['debits'] === 1000.0 && (float)$totals['credits'] === 1000.0, 'Ledger debit and credit totals do not balance.');
    $enrollment = $db->prepare('SELECT status FROM course_enrollments WHERE user_id = ? AND course_id = ?');
    $enrollment->execute([$studentId, $courseIds[0]]);
    check($enrollment->fetchColumn() === 'active', 'Verified full payment did not create an active enrollment.');

    $studentExamList = expect_status(api_request($base, '/api/exams.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Enrolled student lists available exams for an active branch');
    check(in_array($examId, array_map(static fn(array $row): int => (int)$row['id'], $studentExamList['data'] ?? []), true), 'Published exam for an active enrolled branch was not visible.');
    $studentExamDetail = expect_status(api_request($base, '/api/exams.php?action=detail&id=' . $examId, 'GET', null, $notificationStudentCookie), 200, 'Enrolled student opens an available exam');
    check(isset($studentExamDetail['data']['questions'][0]) && !array_key_exists('correct_option_index', $studentExamDetail['data']['questions'][0]), 'Exam detail exposed the answer key to a student.');
    $db->prepare('UPDATE branches SET is_active = 0 WHERE id = ?')->execute([$branchId]);
    $inactiveBranchExamList = expect_status(api_request($base, '/api/exams.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student exam list after branch deactivation');
    check(!in_array($examId, array_map(static fn(array $row): int => (int)$row['id'], $inactiveBranchExamList['data'] ?? []), true), 'Exam in an inactive branch remained visible to an enrolled student.');
    expect_status(api_request($base, '/api/exams.php?action=detail&id=' . $examId, 'GET', null, $notificationStudentCookie), 404, 'Student cannot open an exam from an inactive branch');
    expect_status(api_request($base, '/api/exams.php?action=start&id=' . $examId, 'POST', [], $notificationStudentCookie, $notificationStudentCsrf), 404, 'Student cannot start an exam from an inactive branch');
    $db->prepare('UPDATE branches SET is_active = 1 WHERE id = ?')->execute([$branchId]);
    $studentLiveClasses = expect_status(api_request($base, '/api/live_classes.php?action=list', 'GET', null, $cookie), 200, 'Student lists live classes for enrolled courses');
    check(in_array($liveClassId, array_map(static fn(array $item): int => (int)$item['id'], $studentLiveClasses['data'] ?? []), true), 'Enrolled student could not see the live class for their course.');
    echo 'PASS balanced double-entry ledger, automatic course access and enrolled-student live class visibility' . PHP_EOL;

    expect_status(api_request($base, '/api/payments.php?action=refund&id=' . $paymentId, 'POST', [
        'amount' => '1000.01', 'refund_reference' => 'OVER-' . $suffix, 'reason' => 'Over refund test',
    ], $branchManagerCookie, $branchManagerCsrf), 422, 'Refund API rejects amounts above the remaining refundable balance');
    expect_status(api_request($base, '/api/payments.php?action=refund&id=' . $paymentId, 'POST', [
        'amount' => '100.00', 'refund_reference' => '', 'reason' => 'Missing provider reference test',
    ], $branchManagerCookie, $branchManagerCsrf), 422, 'Refund API requires an external provider refund reference');

    $partialRefund = expect_status(api_request($base, '/api/payments.php?action=refund&id=' . $paymentId, 'POST', [
        'amount' => '250.00', 'refund_reference' => 'TEST-PARTIAL-' . $suffix, 'reason' => 'Partial refund integration test',
    ], $branchManagerCookie, $branchManagerCsrf), 200, 'Branch manager records a provider-confirmed partial refund');
    check(($partialRefund['data']['payment_status'] ?? '') === 'verified', 'Partial refund unexpectedly changed the payment status.');
    check(($partialRefund['data']['remaining_refundable'] ?? '') === '750.00', 'Partial refund remaining balance is incorrect.');
    $commissionAdminCookie = null;
    $commissionAdminLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $adminEmail, 'password' => $adminPassword,
    ], $commissionAdminCookie), 200, 'Admin re-login to review refund-adjusted teacher commissions');
    $commissionAdminCsrf = $commissionAdminLogin['data']['csrf_token'] ?? null;
    $commissionAfterPartialRefund = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary&teacher_id=' . $teacherId, 'GET', null, $commissionAdminCookie), 200, 'Commission summary reflects completed partial refunds');
    check((float)($commissionAfterPartialRefund['data']['totals']['gross_commission'] ?? 0) === 450.0
        && (float)($commissionAfterPartialRefund['data']['totals']['overpaid_commission'] ?? 0) === 50.0,
        'Partial refunds did not reduce commission and show the already-paid recovery amount.');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=review_payout&id=' . $secondPayoutRequestId, 'POST', ['decision' => 'approve'], $commissionAdminCookie, $commissionAdminCsrf), 409, 'Refund-adjusted balance blocks approval of an overdrawn pending payout');
    expect_status(api_request($base, '/api/teacher_commissions.php?action=review_payout&id=' . $secondPayoutRequestId, 'POST', ['decision' => 'reject', 'reason' => 'Balance reduced after refund'], $commissionAdminCookie, $commissionAdminCsrf), 200, 'Admin rejects the now-unfunded payout reservation');
    $studentInboxAfterRefund = expect_status(api_request($base, '/api/notifications.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student receives refund notification');
    check(count(array_filter($studentInboxAfterRefund['data']['items'] ?? [], static fn(array $row): bool => ($row['title'] ?? '') === 'Payment refund recorded')) === 1, 'Refund recording did not notify the student.');
    check(($partialRefund['data']['course_access_cancelled'] ?? false) === true, 'Course access was not cancelled after net paid fell below the course fee.');
    $studentBatchesAfterRefund = expect_status(api_request($base, '/api/batches.php?action=list', 'GET', null, $notificationStudentCookie), 200, 'Student batch list respects revoked course access after refund');
    check(!in_array($batchId, array_map(static fn(array $row): int => (int)$row['id'], $studentBatchesAfterRefund['data'] ?? []), true), 'Refunded student retained access to a course batch.');
    $studentRoutinesAfterRefund = expect_status(api_request($base, '/api/batches.php?action=routines', 'GET', null, $notificationStudentCookie), 200, 'Student routine list respects revoked course access after refund');
    check(count(array_filter($studentRoutinesAfterRefund['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $routineId)) === 0, 'Refunded student retained access to a course routine.');
    $refundRecord = $db->prepare('SELECT amount, refund_reference FROM payment_refunds WHERE payment_id = ? ORDER BY id ASC LIMIT 1');
    $refundRecord->execute([$paymentId]);
    $partialRefundRow = $refundRecord->fetch();
    check($partialRefundRow && $partialRefundRow['amount'] === '250.00' && $partialRefundRow['refund_reference'] === 'TEST-PARTIAL-' . $suffix, 'Partial refund record was not persisted.');
    $branchReconcile = expect_status(api_request($base, '/api/payments.php?action=reconcile', 'GET', null, $branchManagerCookie), 200, 'Branch manager reconciles branch ledger after partial refund');
    check(($branchReconcile['data']['balanced'] ?? false) === true && count($branchReconcile['data']['discrepancies'] ?? []) === 0, 'Ledger reconciliation detected a discrepancy after partial refund.');
    $branchLedgerAfterPartial = expect_status(api_request($base, '/api/payments.php?action=ledger', 'GET', null, $branchManagerCookie), 200, 'Branch manager views payment and refund journal entries');
    check(count(array_filter($branchLedgerAfterPartial['data'] ?? [], static fn(array $row): bool => ($row['transaction_type'] ?? '') === 'refund')) === 2, 'Partial refund did not create a two-line reversal journal.');

    $fullRefund = expect_status(api_request($base, '/api/payments.php?action=refund&id=' . $paymentId, 'POST', [
        'amount' => '750.00', 'refund_reference' => 'TEST-FULL-' . $suffix, 'reason' => 'Final refund integration test',
    ], $branchManagerCookie, $branchManagerCsrf), 200, 'Branch manager records the remaining full refund');
    check(($fullRefund['data']['payment_status'] ?? '') === 'refunded' && ($fullRefund['data']['remaining_refundable'] ?? '') === '0.00', 'Full refund did not close the payment refundable balance.');
    $paymentAfterRefund = $db->prepare('SELECT status FROM course_payments WHERE id = ?');
    $paymentAfterRefund->execute([$paymentId]);
    check($paymentAfterRefund->fetchColumn() === 'refunded', 'Payment status was not marked refunded after full refund.');
    $commissionAfterFullRefund = expect_status(api_request($base, '/api/teacher_commissions.php?action=summary&teacher_id=' . $teacherId, 'GET', null, $commissionAdminCookie), 200, 'Commission summary reflects the full refund');
    check((float)($commissionAfterFullRefund['data']['totals']['gross_commission'] ?? 0) === 0.0
        && (float)($commissionAfterFullRefund['data']['totals']['overpaid_commission'] ?? 0) === 500.0,
        'Full refund did not remove the earned commission and report the already-paid recovery amount.');
    $enrollmentAfterRefund = $db->prepare('SELECT status FROM course_enrollments WHERE user_id = ? AND course_id = ?');
    $enrollmentAfterRefund->execute([$studentId, $courseIds[0]]);
    check($enrollmentAfterRefund->fetchColumn() === 'cancelled', 'Course enrollment was not cancelled after full refund.');
    $refundedPayments = expect_status(api_request($base, '/api/payments.php?action=list&status=refunded', 'GET', null, $branchManagerCookie), 200, 'Branch manager filters fully refunded payments');
    check(in_array($paymentId, array_map(static fn(array $row): int => (int)$row['id'], $refundedPayments['data'] ?? []), true), 'Fully refunded payment is missing from the branch payment queue.');
    $studentRefundHistory = expect_status(api_request($base, '/api/payments.php?action=my', 'GET', null, $cookie), 200, 'Student views refunded payment history');
    check(count(array_filter($studentRefundHistory['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $paymentId && $row['status'] === 'refunded')) === 1, 'Student payment history did not show refunded status.');
    $finalReconcile = expect_status(api_request($base, '/api/payments.php?action=reconcile', 'GET', null, $branchManagerCookie), 200, 'Branch manager reconciles final payment and refund journals');
    check(($finalReconcile['data']['balanced'] ?? false) === true && count($finalReconcile['data']['discrepancies'] ?? []) === 0, 'Ledger is not balanced after full refund.');
    $finalLedger = expect_status(api_request($base, '/api/payments.php?action=ledger', 'GET', null, $branchManagerCookie), 200, 'Branch manager reloads complete payment and refund ledger');
    check(count(array_filter($finalLedger['data'] ?? [], static fn(array $row): bool => (int)$row['payment_id'] === $paymentId)) === 6, 'Expected two payment lines and four refund reversal lines in the ledger.');

    // Consent-based guardian portal: a guardian must not see records before student approval.
    $guardianEmail = "api-guardian-{$suffix}@example.test";
    $guardianPassword = 'TestGuardian!Pass123';
    $insertUser->execute(['API Integration Guardian', $guardianEmail, password_hash($guardianPassword, PASSWORD_DEFAULT), 'guardian']);
    $guardianId = (int)$db->lastInsertId();
    $db->prepare('UPDATE users SET branch_id = ? WHERE id = ?')->execute([$branchId, $guardianId]);

    $guardianCookie = null;
    $guardianLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $guardianEmail, 'password' => $guardianPassword,
    ], $guardianCookie), 200, 'Guardian login for student-link tests');
    $guardianCsrf = $guardianLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/guardians.php?action=my_students', 'GET', null, $guardianCookie), 200, 'Guardian loads an empty linked-student list');

    // A guardian cannot create a link to a student assigned to a different branch.
    $guardianOtherBranchCode = 'GXB-' . strtoupper($suffix);
    $db->prepare('INSERT INTO branches (code, name) VALUES (?, ?)')->execute([$guardianOtherBranchCode, 'Guardian Cross-Branch Test']);
    $guardianOtherBranchId = (int)$db->lastInsertId();
    $guardianOtherBranchStudentEmail = "api-cross-branch-student-{$suffix}@example.test";
    $insertUser->execute(['Cross Branch Student', $guardianOtherBranchStudentEmail, password_hash('TestCrossBranch!Pass123', PASSWORD_DEFAULT), 'student']);
    $guardianOtherBranchStudentId = (int)$db->lastInsertId();
    $db->prepare('UPDATE users SET branch_id = ? WHERE id = ?')->execute([$guardianOtherBranchId, $guardianOtherBranchStudentId]);
    expect_status(api_request($base, '/api/guardians.php?action=request', 'POST', [
        'student_email' => $guardianOtherBranchStudentEmail, 'relationship' => 'Parent',
    ], $guardianCookie, $guardianCsrf), 403, 'Guardian cannot request a student from another branch');

    $guardianRequest = expect_status(api_request($base, '/api/guardians.php?action=request', 'POST', [
        'student_email' => $studentEmail, 'relationship' => 'Parent',
    ], $guardianCookie, $guardianCsrf), 201, 'Guardian requests access to a student account');
    $guardianLinkId = (int)($guardianRequest['data']['id'] ?? 0);
    check($guardianLinkId > 0 && ($guardianRequest['data']['status'] ?? '') === 'pending', 'Guardian request was not created as pending.');
    expect_status(api_request($base, '/api/guardians.php?action=summary&student_id=' . $studentId, 'GET', null, $guardianCookie), 404, 'Guardian cannot view student records before consent');

    $studentConsentCookie = null;
    $studentConsentLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $studentEmail, 'password' => $studentPassword,
    ], $studentConsentCookie), 200, 'Student login to review guardian request');
    $studentConsentCsrf = $studentConsentLogin['data']['csrf_token'] ?? null;
    $incomingGuardianRequests = expect_status(api_request($base, '/api/guardians.php?action=incoming', 'GET', null, $studentConsentCookie), 200, 'Student views incoming guardian requests');
    check(count(array_filter($incomingGuardianRequests['data'] ?? [], static fn(array $row): bool => (int)$row['id'] === $guardianLinkId)) === 1, 'Student did not receive the correct guardian request.');
    expect_status(api_request($base, '/api/guardians.php?action=respond&id=' . $guardianLinkId, 'POST', ['decision' => 'accept'], $studentConsentCookie, $studentConsentCsrf), 200, 'Student accepts guardian access');
    $guardianLinks = expect_status(api_request($base, '/api/guardians.php?action=my_students', 'GET', null, $guardianCookie), 200, 'Guardian reloads approved student links');
    check(count(array_filter($guardianLinks['data'] ?? [], static fn(array $row): bool => (int)$row['student_user_id'] === $studentId && $row['status'] === 'active')) === 1, 'Approved guardian link was not visible to guardian.');
    $guardianSummary = expect_status(api_request($base, '/api/guardians.php?action=summary&student_id=' . $studentId, 'GET', null, $guardianCookie), 200, 'Guardian views consented student progress summary');
    check((int)($guardianSummary['data']['student']['id'] ?? 0) === $studentId, 'Guardian summary returned the wrong student.');
    expect_status(api_request($base, '/api/guardians.php?action=revoke&id=' . $guardianLinkId, 'POST', [], $studentConsentCookie, $studentConsentCsrf), 200, 'Student revokes guardian access');
    expect_status(api_request($base, '/api/guardians.php?action=summary&student_id=' . $studentId, 'GET', null, $guardianCookie), 404, 'Guardian access is removed immediately after revocation');

    // A previously revoked link may be requested again, but still requires a fresh student decision.
    $repeatRequest = expect_status(api_request($base, '/api/guardians.php?action=request', 'POST', [
        'student_email' => $studentEmail, 'relationship' => 'Parent',
    ], $guardianCookie, $guardianCsrf), 201, 'Guardian can submit a fresh request after revocation');
    $repeatLinkId = (int)($repeatRequest['data']['id'] ?? 0);
    check($repeatLinkId === $guardianLinkId, 'A repeated guardian request should reuse the unique relationship row.');
    expect_status(api_request($base, '/api/guardians.php?action=respond&id=' . $repeatLinkId, 'POST', ['decision' => 'reject'], $studentConsentCookie, $studentConsentCsrf), 200, 'Student can reject a renewed guardian request');
    expect_status(api_request($base, '/api/guardians.php?action=summary&student_id=' . $studentId, 'GET', null, $guardianCookie), 404, 'Guardian cannot view records after the student rejects a renewed request');

    $adminBranchCookie = null;
    $adminBranchLogin = expect_status(api_request($base, '/api/auth.php?action=login', 'POST', [
        'email' => $adminEmail, 'password' => $adminPassword,
    ], $adminBranchCookie), 200, 'Admin login to deactivate branch');
    $adminBranchCsrf = $adminBranchLogin['data']['csrf_token'] ?? null;
    expect_status(api_request($base, '/api/branches.php?action=deactivate&id=' . $branchId, 'POST', [], $adminBranchCookie, $adminBranchCsrf), 200, 'Admin deactivates branch after scoped workflows complete');
    expect_status(api_request($base, '/api/users.php?action=list', 'GET', null, $branchManagerCookie), 403, 'Branch manager access is denied after assigned branch deactivation');
    $studentCoursesAfterDeactivation = expect_status(api_request($base, '/api/courses.php?action=list', 'GET', null, $cookie), 200, 'Student catalogue refresh after branch deactivation');
    check(!in_array($courseIds[0], array_map(static fn(array $row): int => (int)$row['id'], $studentCoursesAfterDeactivation['data'] ?? []), true), 'Inactive branch course remained visible in the student catalogue.');
    expect_status(api_request($base, '/api/courses.php?action=detail&id=' . $courseIds[0], 'GET', null, $cookie), 404, 'Student cannot open a course from an inactive branch');
    expect_status(api_request($base, '/api/payments.php?action=submit', 'POST', [
        'course_id' => $courseIds[0], 'amount' => '1.00', 'method' => 'bKash', 'trx_id' => 'INACTIVE-' . $suffix,
    ], $cookie, $csrf), 409, 'Student cannot submit a payment for an inactive branch');
    $studentLiveAfterDeactivation = expect_status(api_request($base, '/api/live_classes.php?action=list', 'GET', null, $cookie), 200, 'Student live class list after branch deactivation');
    check(!in_array($liveClassId, array_map(static fn(array $row): int => (int)$row['id'], $studentLiveAfterDeactivation['data'] ?? []), true), 'Inactive branch live class remained visible to a student.');

    echo 'All PHP API integration checks passed.' . PHP_EOL;
} finally {
    if ($marksheetId !== null) $db->prepare('DELETE FROM marksheets WHERE id = ?')->execute([$marksheetId]);
    if ($recycleExamId !== null) {
        $db->prepare('DELETE FROM exam_attempts WHERE exam_id = ?')->execute([$recycleExamId]);
        $db->prepare('DELETE FROM exam_questions WHERE exam_id = ?')->execute([$recycleExamId]);
        $db->prepare('DELETE FROM exams WHERE id = ?')->execute([$recycleExamId]);
    }
    if ($examId !== null) {
        $db->prepare('DELETE FROM exam_attempts WHERE exam_id = ?')->execute([$examId]);
        $db->prepare('DELETE FROM exam_questions WHERE exam_id = ?')->execute([$examId]);
        $db->prepare('DELETE FROM exams WHERE id = ?')->execute([$examId]);
    }
    if ($liveClassId !== null) $db->prepare('DELETE FROM live_classes WHERE id = ?')->execute([$liveClassId]);
    if ($branchManagerLiveClassId !== null) $db->prepare('DELETE FROM live_classes WHERE id = ?')->execute([$branchManagerLiveClassId]);
    if ($certificateId !== null) $db->prepare('DELETE FROM certificates WHERE id = ?')->execute([$certificateId]);
    if ($questionBankId !== null) $db->prepare('DELETE FROM question_bank_items WHERE id = ?')->execute([$questionBankId]);
    if ($paymentId !== null) {
        $ledgerIds = $db->prepare('SELECT id FROM ledger_transactions WHERE payment_id = ? OR refund_id IN (SELECT id FROM payment_refunds WHERE payment_id = ?)');
        $ledgerIds->execute([$paymentId, $paymentId]);
        $ids = array_map('intval', $ledgerIds->fetchAll(PDO::FETCH_COLUMN));
        if ($ids) {
            $inLedger = implode(',', array_fill(0, count($ids), '?'));
            $db->prepare("DELETE FROM ledger_entries WHERE transaction_id IN ({$inLedger})")->execute($ids);
            $db->prepare("DELETE FROM ledger_transactions WHERE id IN ({$inLedger})")->execute($ids);
        }
        $db->prepare('DELETE FROM payment_refunds WHERE payment_id = ?')->execute([$paymentId]);
        $db->prepare('DELETE FROM course_payments WHERE id = ?')->execute([$paymentId]);
    }
    if (isset($guardianEmail) && is_string($guardianEmail)) $db->prepare("DELETE FROM account_action_attempts WHERE action = 'guardian_link' AND email = ?")->execute([$guardianEmail]);
    if (is_string($guardianOtherBranchStudentEmail)) $db->prepare("DELETE FROM account_action_attempts WHERE action = 'guardian_link' AND email = ?")->execute([$guardianOtherBranchStudentEmail]);
    if ($guardianId !== null && $studentId !== null) {
        $db->prepare('DELETE FROM guardian_student_links WHERE guardian_user_id = ? OR student_user_id = ?')->execute([$guardianId, $studentId]);
        $db->prepare('DELETE FROM notifications WHERE recipient_user_id IN (?, ?) OR sender_user_id IN (?, ?)')->execute([$guardianId, $studentId, $guardianId, $studentId]);
    }
    if ($adminId !== null || $studentId !== null || $guardianId !== null) {
        $actorIds = array_values(array_filter([$adminId, $studentId, $guardianId, $teacherId]));
        $inActors = implode(',', array_fill(0, count($actorIds), '?'));
        $db->prepare("DELETE FROM audit_logs WHERE user_id IN ({$inActors})")->execute($actorIds);
    }
    $db->exec('DELETE FROM recycle_bin_items');
    if ($cmsPostId !== null) $db->prepare('DELETE FROM cms_posts WHERE id = ?')->execute([$cmsPostId]);
    if ($cmsTestimonialId !== null) $db->prepare('DELETE FROM cms_testimonials WHERE id = ?')->execute([$cmsTestimonialId]);
    $testEbookIds = ['ebook_test_' . $suffix, 'ebook_free_' . $suffix, 'ebook_reject_' . $suffix, 'ebook_archived_' . $suffix];
    $ebookFilePlaceholders = implode(',', array_fill(0, count($testEbookIds), '?'));
    $storedEbookFiles = $db->prepare("SELECT storage_filename FROM ebook_files WHERE ebook_id IN ({$ebookFilePlaceholders})");
    $storedEbookFiles->execute($testEbookIds);
    foreach ($storedEbookFiles->fetchAll(PDO::FETCH_COLUMN) as $storedFilename) {
        $storedPath = $root . '/storage/private/ebooks/' . basename((string)$storedFilename);
        if (is_file($storedPath)) @unlink($storedPath);
    }
    $db->prepare("DELETE FROM ebook_files WHERE ebook_id IN ({$ebookFilePlaceholders})")->execute($testEbookIds);
    if ($studentId !== null) {
        $db->prepare('DELETE FROM ebook_orders WHERE user_id = ?')->execute([$studentId]);
        $db->prepare('DELETE FROM product_orders WHERE user_id = ?')->execute([$studentId]);
    }

    if ($admissionApplicationId !== null) $db->prepare('DELETE FROM admission_applications WHERE id = ?')->execute([$admissionApplicationId]);
    if (is_string($privatePdfFixture) && is_file($privatePdfFixture)) @unlink($privatePdfFixture);
    if (is_string($invalidPdfFixture) && is_file($invalidPdfFixture)) @unlink($invalidPdfFixture);
    if (is_string($invalidPdfFixture) && is_file($invalidPdfFixture)) @unlink($invalidPdfFixture);
    $db->prepare("DELETE FROM site_settings WHERE setting_key = 'website'")->execute();
    if ($studentId !== null) $db->prepare('DELETE FROM attendance_records WHERE user_id = ?')->execute([$studentId]);
    if ($studentId !== null) $db->prepare('DELETE FROM course_lesson_progress WHERE user_id = ?')->execute([$studentId]);
    if ($managedStudentId !== null) $db->prepare('DELETE FROM users WHERE id = ?')->execute([$managedStudentId]);
    if ($branchManagedStudentId !== null) {
        $db->prepare('DELETE FROM audit_logs WHERE user_id = ?')->execute([$branchManagedStudentId]);
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$branchManagedStudentId]);
    }
    if ($studentId !== null) $db->prepare('DELETE FROM course_enrollments WHERE user_id = ?')->execute([$studentId]);
    if ($mediaAssetId !== null) {
        $mediaRow = $db->prepare('SELECT storage_filename FROM media_assets WHERE id = ?');
        $mediaRow->execute([$mediaAssetId]);
        $storageName = $mediaRow->fetchColumn();
        if (is_string($storageName) && $storageName !== '') {
            $storedPath = $root . '/storage/private/media/' . $storageName;
            if (is_file($storedPath)) @unlink($storedPath);
        }
        $db->prepare('DELETE FROM media_assets WHERE id = ?')->execute([$mediaAssetId]);
    }
    foreach (array_filter([$contentId, $draftCoursePreviewContentId, $paidContentId]) as $cleanupContentId) {
        $db->prepare('DELETE FROM course_content WHERE content_item_id = ?')->execute([$cleanupContentId]);
        $db->prepare('DELETE FROM content_items WHERE id = ?')->execute([$cleanupContentId]);
    }
    if ($batchId !== null) {
        $db->prepare('DELETE FROM batch_routine_slots WHERE batch_id = ?')->execute([$batchId]);
        $db->prepare('DELETE FROM batch_enrollments WHERE batch_id = ?')->execute([$batchId]);
        $db->prepare('DELETE FROM batches WHERE id = ?')->execute([$batchId]);
    }
    if ($teacherId !== null) $db->prepare('DELETE FROM teacher_course_assignments WHERE teacher_user_id = ?')->execute([$teacherId]);
    $cleanupCourseIds = array_values(array_filter([...$courseIds, $draftCourseId, $branchManagedCourseId]));
    if ($cleanupCourseIds) {
        $in = implode(',', array_fill(0, count($cleanupCourseIds), '?'));
        $db->prepare("DELETE FROM courses WHERE id IN ({$in})")->execute($cleanupCourseIds);
    }
    if ($categoryIds) {
        foreach (array_reverse($categoryIds) as $categoryId) {
            $db->prepare('DELETE FROM course_categories WHERE id = ?')->execute([$categoryId]);
        }
    }
    if ($guardianOtherBranchStudentId !== null) $db->prepare('DELETE FROM users WHERE id = ?')->execute([$guardianOtherBranchStudentId]);
    if ($guardianId !== null) $db->prepare('DELETE FROM users WHERE id = ?')->execute([$guardianId]);
    if ($accountantId !== null) {
        $db->prepare('DELETE FROM notifications WHERE recipient_user_id = ? OR sender_user_id = ?')->execute([$accountantId, $accountantId]);
        $db->prepare('DELETE FROM audit_logs WHERE user_id = ?')->execute([$accountantId]);
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$accountantId]);
    }
    if ($adminId !== null) $db->prepare('DELETE FROM users WHERE id = ?')->execute([$adminId]);
    if ($studentId !== null) $db->prepare('DELETE FROM users WHERE id = ?')->execute([$studentId]);
    if ($teacherId !== null) {
        $db->prepare('DELETE FROM teacher_payout_requests WHERE teacher_user_id = ?')->execute([$teacherId]);
        $db->prepare('DELETE FROM notifications WHERE recipient_user_id = ? OR sender_user_id = ?')->execute([$teacherId, $teacherId]);
        $db->prepare('DELETE FROM audit_logs WHERE user_id = ?')->execute([$teacherId]);
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$teacherId]);
    }
    if ($branchManagerId !== null) $db->prepare('DELETE FROM users WHERE id = ?')->execute([$branchManagerId]);
    if ($guardianOtherBranchId !== null) $db->prepare('DELETE FROM branches WHERE id = ?')->execute([$guardianOtherBranchId]);
    if ($branchId !== null) $db->prepare('DELETE FROM branches WHERE id = ?')->execute([$branchId]);
    if ($otherBranchId !== null) $db->prepare('DELETE FROM branches WHERE id = ?')->execute([$otherBranchId]);
    if (is_resource($server)) {
        proc_terminate($server);
        proc_close($server);
    }
}

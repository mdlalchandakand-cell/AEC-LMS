<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$db = aec_db();
$action = $_GET['action'] ?? 'settings';

function aec_cms_text(mixed $value, string $field, int $max, bool $required = false): string
{
    if (!is_string($value)) {
        if ($required) aec_fail("{$field} is required.", 422);
        return '';
    }
    $value = trim(strip_tags($value));
    if (($required && $value === '') || mb_strlen($value) > $max) {
        aec_fail("{$field} is required and must be no longer than {$max} characters.", 422);
    }
    return $value;
}

function aec_cms_url(mixed $value, string $field): ?string
{
    $url = trim((string)($value ?? ''));
    if ($url === '') return null;
    if (mb_strlen($url) > 2048 || !preg_match('~^(https://|http://|data:image/(?:png|jpeg|webp|gif);base64,)~i', $url)) {
        aec_fail("{$field} must be a valid HTTP(S) URL or supported image data URL.", 422);
    }
    return $url;
}

function aec_cms_post_row(array $row): array
{
    return [
        'id' => (string)$row['id'],
        'title' => $row['title'],
        'titleBn' => $row['title_bn'] ?? '',
        'slug' => $row['slug'],
        'excerpt' => $row['excerpt'],
        'content' => $row['content'],
        'author' => $row['author'],
        'date' => $row['published_at'] ?: $row['created_at'],
        'category' => $row['category'],
        'thumbnail' => $row['thumbnail_url'] ?? '',
        'readTime' => (int)$row['read_time_minutes'] . ' min read',
        'seoTitle' => $row['seo_title'] ?? '',
        'seoDescription' => $row['seo_description'] ?? '',
        'status' => $row['status'],
    ];
}

function aec_cms_testimonial_row(array $row): array
{
    return [
        'id' => (string)$row['id'],
        'studentName' => $row['student_name'],
        'achievement' => $row['achievement'],
        'quote' => $row['quote_text'],
        'quoteBn' => $row['quote_bn'] ?? '',
        'rating' => (int)$row['rating'],
        'avatar' => $row['avatar_url'] ?? '',
        'course' => $row['course_name'],
        'status' => $row['status'],
    ];
}

function aec_cms_post_payload(array $input): array
{
    $title = aec_cms_text($input['title'] ?? null, 'Title', 180, true);
    $titleBn = aec_cms_text($input['title_bn'] ?? '', 'Bangla title', 180);
    $slug = strtolower(trim((string)($input['slug'] ?? '')));
    if ($slug === '') {
        $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($title)) ?? '', '-');
        if ($slug === '') $slug = 'post-' . bin2hex(random_bytes(5));
    }
    if (mb_strlen($slug) > 200 || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        aec_fail('Slug must contain lowercase English letters, numbers and hyphens only.', 422);
    }
    $excerpt = aec_cms_text($input['excerpt'] ?? null, 'Excerpt', 600, true);
    $content = aec_cms_text($input['content'] ?? null, 'Article content', 200000, true);
    $category = aec_cms_text($input['category'] ?? 'General', 'Category', 100, true);
    $author = aec_cms_text($input['author'] ?? 'Alom\'s English Center', 'Author', 120, true);
    $readTime = filter_var($input['read_time_minutes'] ?? 5, FILTER_VALIDATE_INT);
    if ($readTime === false || $readTime < 1 || $readTime > 240) aec_fail('Reading time must be between 1 and 240 minutes.', 422);
    $status = (string)($input['status'] ?? 'published');
    if (!in_array($status, ['draft','published','archived'], true)) aec_fail('Post status is invalid.', 422);
    return [
        'title' => $title,
        'title_bn' => $titleBn ?: null,
        'slug' => $slug,
        'excerpt' => $excerpt,
        'content' => $content,
        'category' => $category,
        'author' => $author,
        'read_time_minutes' => $readTime,
        'thumbnail_url' => aec_cms_url($input['thumbnail_url'] ?? null, 'Thumbnail URL'),
        'seo_title' => aec_cms_text($input['seo_title'] ?? '', 'SEO title', 180) ?: null,
        'seo_description' => aec_cms_text($input['seo_description'] ?? '', 'SEO description', 320) ?: null,
        'status' => $status,
    ];
}

function aec_cms_testimonial_payload(array $input): array
{
    $rating = filter_var($input['rating'] ?? 5, FILTER_VALIDATE_INT);
    if ($rating === false || $rating < 1 || $rating > 5) aec_fail('Rating must be between 1 and 5.', 422);
    $status = (string)($input['status'] ?? 'published');
    if (!in_array($status, ['draft','published','archived'], true)) aec_fail('Testimonial status is invalid.', 422);
    return [
        'student_name' => aec_cms_text($input['student_name'] ?? null, 'Student name', 160, true),
        'achievement' => aec_cms_text($input['achievement'] ?? null, 'Achievement', 180, true),
        'quote_text' => aec_cms_text($input['quote'] ?? null, 'Testimonial', 5000, true),
        'quote_bn' => aec_cms_text($input['quote_bn'] ?? '', 'Bangla testimonial', 5000) ?: null,
        'rating' => $rating,
        'avatar_url' => aec_cms_url($input['avatar_url'] ?? null, 'Avatar URL'),
        'course_name' => aec_cms_text($input['course_name'] ?? '', 'Course name', 180),
        'status' => $status,
    ];
}

if ($action === 'settings') {
    aec_method(['GET']);
    $stmt = $db->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'website' LIMIT 1");
    $stmt->execute();
    $value = $stmt->fetchColumn();
    $settings = $value ? json_decode((string)$value, true) : [];
    aec_ok(is_array($settings) ? $settings : []);
}

if ($action === 'save_settings') {
    aec_method(['POST']);
    $actor = aec_require_permission('cms.manage');
    aec_csrf_check();
    $input = aec_input();
    $settings = $input['settings'] ?? null;
    if (!is_array($settings)) aec_fail('A settings object is required.', 422);
    $allowed = [
        'siteName','siteNameBn','tagline','taglineBn','hotline','email','heroHeadline','heroHighlight','heroSubtitle',
        'bkashNumber','nagadNumber','noticeTicker','showAdmissionBanner','showLiveClassesNotice','logoUrl','faviconUrl',
        'logoText','logoTagline','logoStyle','sliders','sliderAutoPlay','sliderIntervalSec','address','addressBn',
        'chittagongAddress','chittagongAddressBn','supportHours','supportHoursBn','whatsappNumber','facebookPage',
        'youtubeChannel','emergencyNotice','enableNoticeRibbon','googleMapEmbedUrl',
        'homepageSections','bentoOngoing','heroStats','pathsSection','learningPaths','coursesSection','comboOffer',
        'instructorsSection','instructors','whyUsSection','appBannerSection','ebooksSection','ebooks',
        'resultPortalSection','faqItems','footerSettings','productsSection','products','themeSettings',
    ];
    $clean = [];
    foreach ($allowed as $key) {
        if (!array_key_exists($key, $settings)) continue;
        $value = $settings[$key];
        if (is_string($value)) {
            if (mb_strlen($value) > 10000) aec_fail("Setting {$key} is too long.", 422);
            $clean[$key] = trim($value);
        } elseif (is_bool($value) || is_int($value) || is_float($value) || is_array($value) || $value === null) {
            $clean[$key] = $value;
        } else {
            aec_fail("Setting {$key} has an unsupported value.", 422);
        }
    }
    $arraySettingKeys = [
        'homepageSections','bentoOngoing','heroStats','pathsSection','learningPaths','coursesSection','comboOffer',
        'instructorsSection','instructors','whyUsSection','appBannerSection','ebooksSection','ebooks',
        'resultPortalSection','faqItems','footerSettings','productsSection','products','themeSettings',
    ];
    foreach ($arraySettingKeys as $key) {
        if (array_key_exists($key, $clean) && !is_array($clean[$key])) {
            aec_fail("Setting {$key} must be an object or array.", 422);
        }
    }
    foreach (['ebooks','products','instructors','learningPaths','heroStats','faqItems'] as $listKey) {
        if (isset($clean[$listKey]) && count($clean[$listKey]) > 100) {
            aec_fail("Setting {$listKey} exceeds the 100-item limit.", 422);
        }
        if (isset($clean[$listKey])) {
            foreach ($clean[$listKey] as $index => $item) {
                if (!is_array($item)) aec_fail("Setting {$listKey}[{$index}] must be an object.", 422);
            }
        }
    }
    if (isset($clean['ebooks'])) {
        foreach ($clean['ebooks'] as $index => $book) {
            $price = filter_var($book['price'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($price === false || $price < 0 || $price > 1000000) aec_fail("E-book {$index} has an invalid price.", 422);
            if (!isset($book['id'], $book['title']) || trim((string)$book['id']) === '' || trim((string)$book['title']) === '') {
                aec_fail("E-book {$index} requires an id and title.", 422);
            }
            if (isset($book['isActive']) && !is_bool($book['isActive'])) aec_fail("E-book {$index} active flag must be boolean.", 422);
            $coverUrl = trim((string)($book['coverImageUrl'] ?? ''));
            if ($coverUrl !== '' && (!filter_var($coverUrl, FILTER_VALIDATE_URL) || !preg_match('~^https://~i', $coverUrl))) {
                aec_fail("E-book {$index} cover image must use an HTTPS URL.", 422);
            }
            $pdfUrl = trim((string)($book['pdfUrl'] ?? ''));
            if ($pdfUrl !== '' && (empty($book['isFree']) || !filter_var($pdfUrl, FILTER_VALIDATE_URL) || !preg_match('~^https://~i', $pdfUrl))) {
                aec_fail("E-book {$index}: public PDF URLs are allowed only for free e-books and must use HTTPS. Premium PDFs require protected storage.", 422);
            }
        }
    }
    if (isset($clean['products'])) {
        foreach ($clean['products'] as $index => $product) {
            $price = filter_var($product['price'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($price === false || $price <= 0 || $price > 1000000) aec_fail("Product {$index} has an invalid price.", 422);
            if (!isset($product['id'], $product['title']) || trim((string)$product['id']) === '' || trim((string)$product['title']) === '') {
                aec_fail("Product {$index} requires an id and title.", 422);
            }
            if (isset($product['inStock']) && !is_bool($product['inStock'])) aec_fail("Product {$index} stock flag must be boolean.", 422);
            if (isset($product['isActive']) && !is_bool($product['isActive'])) aec_fail("Product {$index} active flag must be boolean.", 422);
            $imageUrl = trim((string)($product['imageUrl'] ?? ''));
            if ($imageUrl !== '' && (!filter_var($imageUrl, FILTER_VALIDATE_URL) || !preg_match('~^https://~i', $imageUrl))) {
                aec_fail("Product {$index} image must use an HTTPS URL.", 422);
            }
        }
    }

    if (isset($clean['homepageSections'])) {
        foreach ($clean['homepageSections'] as $key => $value) {
            if (!preg_match('/^show[A-Z][A-Za-z0-9]*$/', (string)$key) || !is_bool($value)) {
                aec_fail('Homepage section visibility values must be boolean show* flags.', 422);
            }
        }
    }
    if (isset($clean['themeSettings'])) {
        foreach (['primaryColor','secondaryColor','accentCyanColor','accentEmeraldColor','learningPathTitleColor','heroBgTop','heroBgBottom','navbarBg','cardBg','footerBg','footerTextColor','loginButtonColor'] as $colorKey) {
            if (isset($clean['themeSettings'][$colorKey]) && !preg_match('/^#[0-9a-fA-F]{6}$/', (string)$clean['themeSettings'][$colorKey])) {
                aec_fail("Theme color {$colorKey} must be a six-digit HEX color.", 422);
            }
        }
        foreach (['headingFont','bodyFont'] as $fontKey) {
            if (isset($clean['themeSettings'][$fontKey]) && (mb_strlen((string)$clean['themeSettings'][$fontKey]) > 100 || !preg_match('/^[a-zA-Z0-9 ,_\x27"\-]+$/', (string)$clean['themeSettings'][$fontKey]))) {
                aec_fail("Theme font {$fontKey} contains unsupported characters.", 422);
            }
        }
        if (isset($clean['themeSettings']['baseFontSizePx']) && (!is_numeric($clean['themeSettings']['baseFontSizePx']) || (int)$clean['themeSettings']['baseFontSizePx'] < 12 || (int)$clean['themeSettings']['baseFontSizePx'] > 24)) {
            aec_fail('Theme base font size must be between 12 and 24 pixels.', 422);
        }
        if (isset($clean['themeSettings']['headingScale']) && !in_array($clean['themeSettings']['headingScale'], ['compact','standard','large'], true)) {
            aec_fail('Theme heading scale is invalid.', 422);
        }
    }

    if (isset($clean['logoStyle']) && !in_array($clean['logoStyle'], ['icon_and_text','image_only','text_only'], true)) {
        aec_fail('Logo style is invalid.', 422);
    }
    foreach (['showAdmissionBanner','showLiveClassesNotice','sliderAutoPlay','enableNoticeRibbon'] as $booleanKey) {
        if (isset($clean[$booleanKey]) && !is_bool($clean[$booleanKey])) aec_fail("Setting {$booleanKey} must be a boolean.", 422);
    }
    foreach (['logoUrl','faviconUrl'] as $imageKey) {
        if (isset($clean[$imageKey])) {
            $imageValue = trim((string)$clean[$imageKey]);
            if ($imageValue !== '' && mb_strlen($imageValue) > 512000) aec_fail("Setting {$imageKey} is too large.", 413);
            if ($imageValue !== '' && !preg_match('~^(https?://|data:image/(?:png|jpeg|webp|gif);base64,|data:image/svg\\+xml,)~i', $imageValue)) {
                aec_fail("Setting {$imageKey} must be an HTTP(S) URL or supported image data URL.", 422);
            }
        }
    }
    foreach (['facebookPage','youtubeChannel','googleMapEmbedUrl'] as $urlKey) {
        if (isset($clean[$urlKey]) && $clean[$urlKey] !== '' && !filter_var($clean[$urlKey], FILTER_VALIDATE_URL)) {
            aec_fail("Setting {$urlKey} must be a valid URL.", 422);
        }
        if (isset($clean[$urlKey]) && $clean[$urlKey] !== '' && !preg_match('~^https?://~i', $clean[$urlKey])) {
            aec_fail("Setting {$urlKey} must use HTTP or HTTPS.", 422);
        }
    }
    if (isset($clean['sliders'])) {
        if (!is_array($clean['sliders']) || count($clean['sliders']) > 30) aec_fail('A maximum of 30 slider items is allowed.', 422);
        $cleanSliders = [];
        foreach ($clean['sliders'] as $slider) {
            if (!is_array($slider)) aec_fail('Each slider must be an object.', 422);
            $imageUrl = trim((string)($slider['imageUrl'] ?? ''));
            if ($imageUrl !== '' && !preg_match('~^(https?://|data:image/(?:png|jpeg|webp|gif);base64,|data:image/svg\\+xml,)~i', $imageUrl)) {
                aec_fail('Slider image URL must be HTTP(S) or a supported image data URL.', 422);
            }
            $buttonLink = trim((string)($slider['buttonLink'] ?? ''));
            if ($buttonLink !== '' && !str_starts_with($buttonLink, '/') && !str_starts_with($buttonLink, '#') && !preg_match('~^https?://~i', $buttonLink)) {
                aec_fail('Slider button links must be site-relative or HTTP(S) URLs.', 422);
            }
            $cleanSliders[] = [
                'id' => aec_cms_text($slider['id'] ?? '', 'Slider id', 80),
                'title' => aec_cms_text($slider['title'] ?? '', 'Slider title', 180),
                'titleBn' => aec_cms_text($slider['titleBn'] ?? '', 'Bangla slider title', 180),
                'highlight' => aec_cms_text($slider['highlight'] ?? '', 'Slider highlight', 180),
                'highlightBn' => aec_cms_text($slider['highlightBn'] ?? '', 'Bangla slider highlight', 180),
                'subtitle' => aec_cms_text($slider['subtitle'] ?? '', 'Slider subtitle', 600),
                'subtitleBn' => aec_cms_text($slider['subtitleBn'] ?? '', 'Bangla slider subtitle', 600),
                'badge' => aec_cms_text($slider['badge'] ?? '', 'Slider badge', 100),
                'badgeBn' => aec_cms_text($slider['badgeBn'] ?? '', 'Bangla slider badge', 100),
                'imageUrl' => $imageUrl,
                'buttonText' => aec_cms_text($slider['buttonText'] ?? '', 'Slider button text', 100),
                'buttonTextBn' => aec_cms_text($slider['buttonTextBn'] ?? '', 'Bangla slider button text', 100),
                'buttonLink' => $buttonLink,
                'isActive' => !empty($slider['isActive']),
                'order' => max(0, (int)($slider['order'] ?? 0)),
            ];
        }
        $clean['sliders'] = $cleanSliders;
    }
    if (isset($clean['sliderIntervalSec']) && (!is_numeric($clean['sliderIntervalSec']) || (int)$clean['sliderIntervalSec'] < 1 || (int)$clean['sliderIntervalSec'] > 60)) {
        aec_fail('Slider interval must be between 1 and 60 seconds.', 422);
    }
    $json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > 512000) aec_fail('Website settings exceed the maximum allowed size.', 413);
    $stmt = $db->prepare(
        "INSERT INTO site_settings (setting_key, setting_value, updated_by, updated_at)
         VALUES ('website', ?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = NOW()"
    );
    $stmt->execute([$json, (int)$actor['id']]);
    $audit = $db->prepare("INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES (?, 'cms.settings.updated', 'site_settings', 1, ?, ?)");
    $audit->execute([(int)$actor['id'], substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45) ?: null, json_encode(['keys' => array_keys($clean)])]);
    aec_ok($clean, 'Website settings saved.');
}

if ($action === 'public_posts' || $action === 'posts') {
    aec_method(['GET']);
    if ($action === 'posts') aec_require_permission('cms.manage');
    $sql = 'SELECT * FROM cms_posts WHERE deleted_at IS NULL';
    if ($action === 'public_posts') $sql .= " AND status = 'published'";
    $sql .= $action === 'public_posts' ? ' ORDER BY published_at DESC, id DESC LIMIT 100' : ' ORDER BY created_at DESC, id DESC LIMIT 500';
    $rows = $db->query($sql)->fetchAll();
    aec_ok(array_map('aec_cms_post_row', $rows));
}

if ($action === 'post') {
    aec_method(['GET']);
    $slug = trim((string)($_GET['slug'] ?? ''));
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if ($slug === '' && (!$id || $id < 1)) aec_fail('A post slug or identifier is required.', 422);
    $canManage = false;
    if (!empty($_SESSION['user_id'])) {
        $user = aec_current_user();
        if ($user['role'] === 'super_admin') $canManage = true;
        else {
            $permission = $db->prepare("SELECT allowed FROM role_permissions WHERE role = ? AND permission_key = 'cms.manage' LIMIT 1");
            $permission->execute([$user['role']]);
            $canManage = (bool)$permission->fetchColumn();
        }
    }
    $sql = 'SELECT * FROM cms_posts WHERE deleted_at IS NULL AND ';
    $params = [];
    if ($slug !== '') { $sql .= 'slug = ?'; $params[] = $slug; }
    else { $sql .= 'id = ?'; $params[] = $id; }
    if (!$canManage) $sql .= " AND status = 'published'";
    $stmt = $db->prepare($sql . ' LIMIT 1');
    $stmt->execute($params);
    $row = $stmt->fetch();
    if (!$row) aec_fail('Post not found.', 404);
    aec_ok(aec_cms_post_row($row));
}

if ($action === 'public_testimonials' || $action === 'testimonials') {
    aec_method(['GET']);
    if ($action === 'testimonials') aec_require_permission('cms.manage');
    $sql = 'SELECT * FROM cms_testimonials WHERE deleted_at IS NULL';
    if ($action === 'public_testimonials') $sql .= " AND status = 'published'";
    $sql .= ' ORDER BY created_at DESC, id DESC LIMIT 200';
    $rows = $db->query($sql)->fetchAll();
    aec_ok(array_map('aec_cms_testimonial_row', $rows));
}

if (in_array($action, ['create_post','update_post','delete_post','create_testimonial','update_testimonial','delete_testimonial'], true)) {
    aec_method(['POST']);
    $actor = aec_require_permission('cms.manage');
    aec_csrf_check();
    $input = aec_input();
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

    if ($action === 'delete_post' || $action === 'delete_testimonial') {
        $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
        if (!$id || $id < 1) aec_fail('A valid content id is required.', 422);
        $isPost = $action === 'delete_post';
        $table = $isPost ? 'cms_posts' : 'cms_testimonials';
        $db->beginTransaction();
        try {
            $select = $db->prepare("SELECT * FROM {$table} WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE");
            $select->execute([$id]); $record = $select->fetch();
            if (!$record) aec_fail('Content item not found.', 404);
            $stmt = $db->prepare("UPDATE {$table} SET status = 'archived', deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL");
            $stmt->execute([$id]);
            if ($stmt->rowCount() !== 1) aec_fail('Content item not found.', 404);
            $entityType = $isPost ? 'cms_post' : 'cms_testimonial';
            $title = $isPost ? (string)$record['title'] : (string)$record['student_name'];
            $snapshot = $isPost
                ? ['status' => $record['status'], 'slug' => $record['slug'], 'category' => $record['category']]
                : ['status' => $record['status'], 'achievement' => $record['achievement']];
            aec_recycle_bin_record($db, $actor, $entityType, (int)$id, $title, null, $snapshot);
            $db->commit();
            aec_ok(['id' => $id], 'Content item archived and moved to recycle bin.');
        } catch (Throwable $error) {
            if ($db->inTransaction()) $db->rollBack();
            throw $error;
        }
    }

    if ($action === 'create_post' || $action === 'update_post') {
        $payload = aec_cms_post_payload($input);
        if ($action === 'create_post') {
            $stmt = $db->prepare(
                'INSERT INTO cms_posts (title, title_bn, slug, excerpt, content, category, author, read_time_minutes,
                 thumbnail_url, seo_title, seo_description, status, published_at, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(? = \'published\', NOW(), NULL), ?)'
            );
            try {
                $stmt->execute([
                    $payload['title'], $payload['title_bn'], $payload['slug'], $payload['excerpt'], $payload['content'],
                    $payload['category'], $payload['author'], $payload['read_time_minutes'], $payload['thumbnail_url'],
                    $payload['seo_title'], $payload['seo_description'], $payload['status'], $payload['status'], (int)$actor['id'],
                ]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') aec_fail('A post with this slug already exists.', 409);
                throw $error;
            }
            aec_ok(['id' => (int)$db->lastInsertId()], 'Blog post created.', 201);
        }
        if (!$id || $id < 1) aec_fail('A valid post identifier is required.', 422);
        $stmt = $db->prepare(
            'UPDATE cms_posts SET title = ?, title_bn = ?, slug = ?, excerpt = ?, content = ?, category = ?, author = ?,
             read_time_minutes = ?, thumbnail_url = ?, seo_title = ?, seo_description = ?, status = ?,
             published_at = IF(? = \'published\', COALESCE(published_at, NOW()), published_at), updated_at = NOW()
             WHERE id = ? AND deleted_at IS NULL'
        );
        try {
            $stmt->execute([
                $payload['title'], $payload['title_bn'], $payload['slug'], $payload['excerpt'], $payload['content'],
                $payload['category'], $payload['author'], $payload['read_time_minutes'], $payload['thumbnail_url'],
                $payload['seo_title'], $payload['seo_description'], $payload['status'], $payload['status'], $id,
            ]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') aec_fail('A post with this slug already exists.', 409);
            throw $error;
        }
        $exists = $db->prepare('SELECT id FROM cms_posts WHERE id = ? AND deleted_at IS NULL LIMIT 1');
        $exists->execute([$id]);
        if (!$exists->fetch()) aec_fail('Blog post not found.', 404);
        aec_ok(['id' => (int)$id], 'Blog post updated.');
    }

    $payload = aec_cms_testimonial_payload($input);
    if ($action === 'create_testimonial') {
        $stmt = $db->prepare(
            'INSERT INTO cms_testimonials (student_name, achievement, quote_text, quote_bn, rating, avatar_url, course_name, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $payload['student_name'], $payload['achievement'], $payload['quote_text'], $payload['quote_bn'],
            $payload['rating'], $payload['avatar_url'], $payload['course_name'], $payload['status'], (int)$actor['id'],
        ]);
        aec_ok(['id' => (int)$db->lastInsertId()], 'Testimonial created.', 201);
    }
    if (!$id || $id < 1) aec_fail('A valid testimonial identifier is required.', 422);
    $stmt = $db->prepare(
        'UPDATE cms_testimonials SET student_name = ?, achievement = ?, quote_text = ?, quote_bn = ?, rating = ?,
         avatar_url = ?, course_name = ?, status = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL'
    );
    $stmt->execute([
        $payload['student_name'], $payload['achievement'], $payload['quote_text'], $payload['quote_bn'],
        $payload['rating'], $payload['avatar_url'], $payload['course_name'], $payload['status'], $id,
    ]);
    $exists = $db->prepare('SELECT id FROM cms_testimonials WHERE id = ? AND deleted_at IS NULL LIMIT 1');
    $exists->execute([$id]);
    if (!$exists->fetch()) aec_fail('Testimonial not found.', 404);
    aec_ok(['id' => (int)$id], 'Testimonial updated.');
}

aec_fail('Unknown CMS action.', 404);

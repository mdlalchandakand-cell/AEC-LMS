# Product identity and interface standard

## Product identity

**Product:** Alom's English Center LMS  
**Short name:** Alom LMS  
**Audience:** English learners, teachers, guardians, academic administrators and finance staff  
**Primary market:** Bangladesh, with international-ready course delivery  
**Languages:** Bangla and English  
**Currency:** BDT (৳)

The product should feel like a professionally operated English learning institution: clear, calm, credible and academically focused. It must not resemble a generic admin template or an unmodified AI-generated dashboard.

## Visual system

- **Deep navy — #142B45:** primary navigation, strong headings and institutional trust.
- **Teal — #147D78:** primary actions, progress and learning states.
- **Warm paper — #F7F6F2:** primary application canvas.
- **White — #FFFFFF:** content surfaces.
- **Ink — #243447:** body text.
- **Muted slate — #687789:** secondary information.
- **Amber — #D6A34A:** limited use for attention and achievement.
- **Red — #B94747:** destructive and error states only.

Use spacing and typography consistently. Prefer clear page hierarchy, restrained shadows, deliberate whitespace, readable tables and purposeful empty states. Avoid excessive gradients, glass effects, decorative charts, random icon use, oversized rounded cards and repetitive dashboard widgets.

## Interaction standards

- Every button must perform a real action or be clearly disabled with a reason.
- Forms need validation, useful error messages, loading states and success confirmation.
- Destructive actions require confirmation and must respect backend permissions.
- Lists need search, filters, sorting, pagination and useful empty states where appropriate.
- Mobile layouts must remain usable without hiding critical actions.
- Bangla text must use a suitable Bangla font and must not be clipped.

## Content standards

- Remove placeholder copy, fake testimonials, fabricated statistics, demo payment confirmations and sample credentials from production flows.
- Seed only clearly labelled optional demo data; never silently mix it with live records.
- Use institution-specific, concise English and Bangla copy.
- Never claim a payment, certificate, attendance record or exam result is verified unless the server has confirmed it.

## Product architecture standards

### Reusable learning content

Keep Courses, Course Categories, Lessons/Posts, Videos, Sections and Question Sets as distinct domain entities. Connect courses to lessons through a many-to-many relationship. A single lesson may be assigned to multiple courses; editing the source lesson should update every course that references it. Support draft, preview, publish, revisions and controlled cloning.

### Backend and data integrity

- PHP 8.3+ with PDO and MySQL/MariaDB for the cPanel production target.
- Server-side sessions with secure cookie settings, CSRF protection and password hashing.
- Explicit RBAC with permission checks on the server.
- Foreign keys, indexes, transactions and non-destructive migrations.
- Payment verification and accounting ledger changes must be atomic and auditable.
- File uploads require type/size validation, safe storage and access controls.

### Release gate

No build or ZIP should be labelled final until:
- Frontend production build and type checks pass.
- PHP syntax checks and API tests pass.
- Database installation and upgrade paths pass on a clean test database.
- Existing data is preserved during upgrades.
- Authentication, role isolation, payments, course access and certificates are tested end to end.
- cPanel installation, permissions, HTTPS and backup/restore are verified.

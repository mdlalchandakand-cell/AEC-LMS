<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The legacy LMS users table remains the source of truth during migration.
     */
    protected $table = 'users';

    /**
     * Keep privilege-bearing fields (role, branch_id, is_active and
     * session_version) out of mass assignment. Dedicated admin workflows
     * must set those fields explicitly after authorization.
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password_hash',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    /**
     * The existing PHP LMS stores password hashes in password_hash, not
     * Laravel's default password column. This keeps Laravel's auth provider
     * compatible with existing accounts without changing the database.
     */
    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function getAuthPassword(): string
    {
        return (string) $this->getAttribute('password_hash');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(CourseEnrollment::class, 'user_id');
    }

    public function createdEnrollments(): HasMany
    {
        return $this->hasMany(CourseEnrollment::class, 'enrolled_by');
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password_hash' => 'hashed',
            'is_active' => 'boolean',
            'session_version' => 'integer',
        ];
    }
}

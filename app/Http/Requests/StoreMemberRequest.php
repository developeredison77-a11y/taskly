<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequeuse Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'max:255',
                'email:rfc,dns',
                Rule::unique('users', 'email'),
            ],
            'phone' => 'required|string|max:30',
            'status' => 'required|in:active,inactive',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'workspace_ids' => 'required|array|min:1',
            'workspace_ids.*' => 'exists:workspaces,id',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => strtolower(trim((string) $this->input('email'))),
            ]);
        }
spaces,id',
        ];
    }
}


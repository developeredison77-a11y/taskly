<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'required|string|max:30',
            'status' => 'required|in:active,inactive',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
            'workspace_ids' => 'required|array|min:1',
            'workspace_ids.*' => 'exists:workspaces,id',
        ];
    }
}

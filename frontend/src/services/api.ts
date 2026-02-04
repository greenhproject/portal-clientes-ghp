/**
 * API Service para comunicación con el backend
 * Green House Project - Sistema de Soporte
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

// URL del backend - cambiar en producción
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token a todas las peticiones
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para manejar errores de autenticación
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expirado, limpiar y redirigir al login
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Autenticación
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
    opensolar_project_ids?: string[];
  }) {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  }) {
    const response = await this.api.put('/auth/me', data);
    return response.data;
  }

  // Performance
  async getMyPerformance() {
    const response = await this.api.get('/users/me/performance');
    return response.data;
  }

  // Tickets
  async createTicket(data: {
    project_id: string;
    category: string;
    subcategory?: string;
    priority: string;
    title: string;
    description: string;
  }) {
    const response = await this.api.post('/tickets/', data);
    return response.data;
  }

  async getTickets(params?: {
    status?: string;
    priority?: string;
    category?: string;
    page?: number;
    per_page?: number;
  }) {
    const response = await this.api.get('/tickets/', { params });
    return response.data;
  }

  async getTicket(ticketId: string) {
    const response = await this.api.get(`/tickets/${ticketId}`);
    return response.data;
  }

  async assignTicket(ticketId: string, engineerId: string) {
    const response = await this.api.post(`/tickets/${ticketId}/assign`, {
      engineer_id: engineerId,
    });
    return response.data;
  }

  async changeTicketStatus(ticketId: string, status: string, notes?: string) {
    const response = await this.api.post(`/tickets/${ticketId}/status`, {
      status,
      notes,
    });
    return response.data;
  }

  async resolveTicket(ticketId: string, resolutionNotes: string) {
    const response = await this.api.post(`/tickets/${ticketId}/resolve`, {
      resolution_notes: resolutionNotes,
    });
    return response.data;
  }

  async closeTicket(ticketId: string, rating?: number, ratingComment?: string) {
    const response = await this.api.post(`/tickets/${ticketId}/close`, {
      rating,
      rating_comment: ratingComment,
    });
    return response.data;
  }

  async getTicketHistory(ticketId: string) {
    const response = await this.api.get(`/tickets/${ticketId}/history`);
    return response.data;
  }

  // Comentarios
  async createComment(data: {
    ticket_id: string;
    content: string;
    type?: string;
  }) {
    const response = await this.api.post('/comments/', data);
    return response.data;
  }

  async addComment(ticketId: string, content: string) {
    return this.createComment({ ticket_id: ticketId, content });
  }

  async getTicketComments(ticketId: string) {
    const response = await this.api.get(`/comments/ticket/${ticketId}`);
    return response.data;
  }

  async updateComment(commentId: string, content: string) {
    const response = await this.api.put(`/comments/${commentId}`, { content });
    return response.data;
  }

  async deleteComment(commentId: string) {
    const response = await this.api.delete(`/comments/${commentId}`);
    return response.data;
  }

  // Dashboard
  async getDashboardStats() {
    const response = await this.api.get('/dashboard/stats');
    return response.data;
  }

  // Usuarios
  async getEngineers() {
    const response = await this.api.get('/users/engineers');
    return response.data;
  }

  // Notificaciones
  async getNotifications(unreadOnly = false) {
    const response = await this.api.get('/notifications/', {
      params: { unread_only: unreadOnly },
    });
    return response.data;
  }

  async markNotificationAsRead(notificationId: string) {
    const response = await this.api.post(`/notifications/${notificationId}/read`);
    return response.data;
  }

  // Attachments
  async uploadAttachment(formData: FormData, onProgress?: (progressEvent: any) => void) {
    const response = await this.api.post('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress,
    });
    return response.data;
  }

  async getTicketAttachments(ticketId: string) {
    const response = await this.api.get(`/attachments/ticket/${ticketId}`);
    return response.data;
  }

  async deleteAttachment(attachmentId: string) {
    const response = await this.api.delete(`/attachments/${attachmentId}`);
    return response.data;
  }

  // Ticket Management (Admin only)
  async updateTicket(ticketId: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    category?: string;
    subcategory?: string;
  }) {
    const response = await this.api.patch(`/tickets/${ticketId}`, data);
    return response.data;
  }

  async deleteTicket(ticketId: string) {
    const response = await this.api.delete(`/tickets/${ticketId}`);
    return response.data;
  }

  // User Management (Admin only)
  async getUsers() {
    const response = await this.api.get('/users');
    return response.data;
  }

  async updateUser(userId: string, data: {
    full_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    opensolar_project_ids?: string[];
  }) {
    const response = await this.api.put(`/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.api.delete(`/users/${userId}`);
    return response.data;
  }

  // Settings Management (Admin only)
  async getSettings() {
    const response = await this.api.get('/settings');
    return response.data;
  }

  async updateSettings(settings: any) {
    const response = await this.api.put('/settings', settings);
    return response.data;
  }

  async getCategories() {
    const response = await this.api.get('/settings/categories');
    return response.data;
  }

  async getPriorities() {
    const response = await this.api.get('/settings/priorities');
    return response.data;
  }

  // Password Reset
  async forgotPassword(email: string) {
    const response = await this.api.post('/auth/forgot-password', { email });
    return response.data;
  }

  async validateResetToken(token: string) {
    const response = await this.api.post('/auth/validate-reset-token', { token });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.api.post('/auth/reset-password', { token, new_password: newPassword });
    return response.data;
  }
}

export const apiService = new ApiService();
export const api = apiService; // Alias for convenience
export default apiService;

import { request } from './http.js';

/**
 * Projects & Project Tasks.
 *
 * Backend: backend/src/modules/projects/projects.controller.ts
 *  - GET    /projects
 *  - GET    /projects/:id
 *  - POST   /projects
 *  - PATCH  /projects/:id
 *  - DELETE /projects/:id
 *  - GET    /projects/:id/labor-hours
 *  - GET    /projects/:id/tasks
 *  - POST   /projects/tasks
 *  - PATCH  /projects/tasks/:taskId
 *  - DELETE /projects/tasks/:taskId
 */
export const projectsService = {
  // ---------- Project CRUD ----------
  async getAll() {
    return request('/projects');
  },

  async getOne(id) {
    return request(`/projects/${id}`);
  },

  async create(data) {
    return request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id, data) {
    return request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async remove(id) {
    return request(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async getLaborHours(id) {
    return request(`/projects/${id}/labor-hours`);
  },

  // ---------- Tasks ----------
  async getTasks(projectId) {
    return request(`/projects/${projectId}/tasks`);
  },

  async createTask(data) {
    return request('/projects/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(taskId, data) {
    return request(`/projects/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async removeTask(taskId) {
    return request(`/projects/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },
};

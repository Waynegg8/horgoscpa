/**
 * Settings Page
 * 设置页面
 */

import { AuthUtils } from '../core/utils/auth.js';
import { ClientService } from '../modules/clients/ClientService.js';
import { EmployeeService } from '../modules/employees/EmployeeService.js';
import { Loading } from '../components/feedback/Loading.js';
import { Toast } from '../components/feedback/Toast.js';
import { Modal } from '../components/layout/Modal.js';

export class SettingsPage {
  constructor() {
    this.currentUser = null;
    this.currentTab = 'clients';
  }

  async init() {
    if (!AuthUtils.requireAuth()) return;

    this.currentUser = AuthUtils.getCurrentUser();
    this._bindEvents();
    await this.loadCurrentTab();
  }

  _bindEvents() {
    // Tab 切换
    document.querySelectorAll('[data-settings-tab]').forEach(tab => {
      tab.addEventListener('click', async (e) => {
        this.currentTab = e.target.dataset.settingsTab;
        document.querySelectorAll('[data-settings-tab]').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        await this.loadCurrentTab();
      });
    });
  }

  async loadCurrentTab() {
    switch (this.currentTab) {
      case 'clients':
        await this.loadClients();
        break;
      case 'employees':
        await this.loadEmployees();
        break;
      case 'services':
        await this.loadServices();
        break;
      case 'system':
        await this.loadSystemConfig();
        break;
    }
  }

  async loadClients() {
    const container = document.getElementById('clientsContainer');
    if (!container) return;

    Loading.show(container);

    try {
      const clients = await ClientService.getList();
      
      if (clients.length === 0) {
        Loading.showEmpty(container, '暂无客户');
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>客户名称</th>
                <th>统一编号</th>
                <th>联系人</th>
                <th>电话</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${clients.map(client => `
                <tr>
                  <td>${client.name}</td>
                  <td>${client.tax_id || '-'}</td>
                  <td>${client.contact_person || '-'}</td>
                  <td>${client.phone || '-'}</td>
                  <td><span class="status-${client.status}">${client.status}</span></td>
                  <td>
                    <button class="btn-sm" onclick="window.settingsPage.editClient(${client.id})">编辑</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  async loadEmployees() {
    const container = document.getElementById('employeesContainer');
    if (!container) return;

    Loading.show(container);

    try {
      const employees = await EmployeeService.getAll();
      
      if (employees.length === 0) {
        Loading.showEmpty(container, '暂无员工');
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>入职日期</th>
                <th>性别</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${employees.map(emp => `
                <tr>
                  <td>${emp.name}</td>
                  <td>${emp.hire_date || '-'}</td>
                  <td>${emp.gender || '-'}</td>
                  <td>
                    <button class="btn-sm" onclick="window.settingsPage.editEmployee(${emp.id})">编辑</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  async loadServices() {
    const container = document.getElementById('servicesContainer');
    if (!container) return;

    Loading.show(container);

    try {
      const services = await ClientService.getServices();
      
      if (services.length === 0) {
        Loading.showEmpty(container, '暂无服务配置');
        return;
      }

      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>客户</th>
                <th>服务类型</th>
                <th>频率</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${services.map(s => `
                <tr>
                  <td>${s.client_name || '-'}</td>
                  <td>${s.service_type}</td>
                  <td>${s.frequency}</td>
                  <td><span class="status-${s.is_active ? 'active' : 'inactive'}">${s.is_active ? '启用' : '停用'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  async loadSystemConfig() {
    const container = document.getElementById('systemConfigContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="config-info">
        <p>系统配置管理</p>
      </div>
    `;
  }

  editClient(id) {
    Toast.info('编辑客户功能待完善');
  }

  editEmployee(id) {
    Toast.info('编辑员工功能待完善');
  }
}

window.SettingsPage = SettingsPage;
export default SettingsPage;


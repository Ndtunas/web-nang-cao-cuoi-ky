import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  vi: {
    translation: {
      appTitle: "Hệ Thống Quản Lý Nhân Sự (HRM)",
      nav: {
        dashboard: "Tổng quan",
        employees: "Danh sách Nhân viên",
        departments: "Phòng ban",
        attendance: "Chấm công",
        payroll: "Bảng lương",
        settings: "Cài đặt"
      },
      header: {
        searchPlaceholder: "Tìm kiếm nhân viên, phòng ban...",
        language: "Ngôn ngữ",
        admin: "Quản trị viên"
      },
      stats: {
        totalEmployees: "Tổng số nhân viên",
        activeEmployees: "Nhân viên đang làm",
        onLeave: "Nghỉ phép hôm nay",
        newHires: "Tuyên dụng mới (tháng)"
      },
      employeeTable: {
        title: "Danh sách Nhân viên",
        addEmployee: "Thêm Nhân viên",
        id: "Mã NV",
        name: "Họ và Tên",
        department: "Phòng ban",
        position: "Chức vụ",
        status: "Trạng thái",
        actions: "Thao tác",
        active: "Đang làm việc",
        onLeave: "Nghỉ phép",
        terminated: "Đã nghỉ việc",
        edit: "Sửa",
        delete: "Xóa"
      },
      modal: {
        titleAdd: "Thêm Nhân Viên Mới",
        titleEdit: "Chỉnh Sửa Thông Tin Nhân Viên",
        save: "Lưu thông tin",
        cancel: "Hủy bỏ",
        fields: {
          name: "Họ và Tên",
          email: "Email",
          phone: "Số điện thoại",
          department: "Phòng ban",
          position: "Chức vụ",
          status: "Trạng thái"
        }
      }
    }
  },
  en: {
    translation: {
      appTitle: "Human Resource Management (HRM)",
      nav: {
        dashboard: "Dashboard",
        employees: "Employees",
        departments: "Departments",
        attendance: "Attendance",
        payroll: "Payroll",
        settings: "Settings"
      },
      header: {
        searchPlaceholder: "Search employees, departments...",
        language: "Language",
        admin: "Administrator"
      },
      stats: {
        totalEmployees: "Total Employees",
        activeEmployees: "Active Staff",
        onLeave: "On Leave Today",
        newHires: "New Hires (Month)"
      },
      employeeTable: {
        title: "Employee Directory",
        addEmployee: "Add Employee",
        id: "EMP ID",
        name: "Full Name",
        department: "Department",
        position: "Position",
        status: "Status",
        actions: "Actions",
        active: "Active",
        onLeave: "On Leave",
        terminated: "Terminated",
        edit: "Edit",
        delete: "Delete"
      },
      modal: {
        titleAdd: "Add New Employee",
        titleEdit: "Edit Employee Info",
        save: "Save Details",
        cancel: "Cancel",
        fields: {
          name: "Full Name",
          email: "Email",
          phone: "Phone Number",
          department: "Department",
          position: "Position",
          status: "Status"
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'vi', // Ngôn ngữ mặc định: Tiếng Việt
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

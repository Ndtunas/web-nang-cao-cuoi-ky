#!/bin/bash
# Generate skeleton module files for all business modules
BASE="src/modules"

# Module definitions: folder|controllerPrefix|moduleName
MODULES=(
  "audit-logs|audit-logs|AuditLogs"
  "auth|auth|Auth"
  "users|users|Users"
  "config|config/work-rates|WorkRateConfig"
  "timesheets|timesheets|Timesheets"
  "approval|approval|Approval"
  "onboarding|onboarding|Onboarding"
  "offboarding|offboarding|Offboarding"
  "employees|employees|Employees"
  "attendance|attendance|Attendance"
  "leave-requests|leave-requests|LeaveRequests"
  "payroll|payroll|Payroll"
  "departments|departments|Departments"
  "positions|positions|Positions"
  "projects|projects|Projects"
  "notifications|notifications|Notifications"
)

for entry in "${MODULES[@]}"; do
  IFS='|' read -r folder prefix name <<< "$entry"
  dir="$BASE/$folder"
  mkdir -p "$dir/dto"
  
  # kebab case for filenames
  kebab=$(echo "$folder" | tr '[:upper:]' '[:lower:]')
  
  echo "Created: $dir"
done

echo "All module directories created."

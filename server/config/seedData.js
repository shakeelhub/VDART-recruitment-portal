import bcrypt from 'bcryptjs';
import Employee from '../schema/Employee.js';

// Seed employees into database (run once)
export const seedEmployees = async () => {
  try {
    const count = await Employee.countDocuments();
    if (count === 0) {
      console.log('🌱 Adding employees to database...');
      
      const employees = [
        // L&D Team
        { empId: 'LD001', password: await bcrypt.hash('ld123', 10), name: 'Sarah Johnson', team: 'L&D', email: 'sarah@vdart.com' },
        { empId: 'LD002', password: await bcrypt.hash('ld456', 10), name: 'Mike Chen', team: 'L&D', email: 'mike@vdart.com' },
        { empId: 'LD003', password: await bcrypt.hash('ld789', 10), name: 'Emma Davis', team: 'L&D', email: 'emma@vdart.com' },
        
        // HR Team
        // { empId: 'HR001', password: await bcrypt.hash('hr123', 10), name: 'David Wilson', team: 'HR', email: 'david@vdart.com' },
        // { empId: 'HR002', password: await bcrypt.hash('hr456', 10), name: 'Lisa Brown', team: 'HR', email: 'lisa@vdart.com' },
        // { empId: 'HR003', password: await bcrypt.hash('hr789', 10), name: 'Alex Thompson', team: 'HR', email: 'alex@vdart.com' },
        
        // Hareesh Team
        { empId: 'HAR001', password: await bcrypt.hash('har123', 10), name: 'Hareesh Kumar', team: 'Hareesh', email: 'hareesh@vdart.com' },
        { empId: 'HAR002', password: await bcrypt.hash('har456', 10), name: 'Priya Sharma', team: 'Hareesh', email: 'priya@vdart.com' },
        { empId: 'HAR003', password: await bcrypt.hash('har789', 10), name: 'Raj Patel', team: 'Hareesh', email: 'raj@vdart.com' },
        
        // HR Tag 
        { empId: 'HRT002', password: await bcrypt.hash('hrt456', 10), name: 'Robert Kim', team: 'HR Tag', email: 'robert@vdart.com' },
        { empId: 'HRT003', password: await bcrypt.hash('hrt789', 10), name: 'Maria Garcia', team: 'HR Tag', email: 'maria@vdart.com' },
        
        // Admin Team
        { empId: 'ADM001', password: await bcrypt.hash('adm123', 10), name: 'Michael Scott', team: 'Admin', email: 'michael@vdart.com' },
        { empId: 'ADM002', password: await bcrypt.hash('adm456', 10), name: 'Rachel Green', team: 'Admin', email: 'rachel@vdart.com' },
        { empId: 'ADM003', password: await bcrypt.hash('adm789', 10), name: 'James Bond', team: 'Admin', email: 'james@vdart.com' },
        
        // HR Ops Team
        { empId: 'HRO001', password: await bcrypt.hash('hro123', 10), name: 'Amanda Clark', team: 'HR Ops', email: 'amanda@vdart.com' },
        { empId: 'HRO002', password: await bcrypt.hash('hro456', 10), name: 'Daniel Lee', team: 'HR Ops', email: 'daniel@vdart.com' },
        { empId: 'HRO003', password: await bcrypt.hash('hro789', 10), name: 'Sophie Turner', team: 'HR Ops', email: 'sophie@vdart.com' },

         // IT Team
        { empId: 'ITO001', password: await bcrypt.hash('it1', 10), name: 'Amanda Clark', team: 'IT', email: 'amanda@vdart.com' },
        { empId: 'ITO002', password: await bcrypt.hash('it2', 10), name: 'Daniel Lee', team: 'IT', email: 'daniel@vdart.com' },
        { empId: 'ITO003', password: await bcrypt.hash('it3', 10), name: 'Sophie Turner', team: 'IT', email: 'sophie@vdart.com' }
      ];

      await Employee.insertMany(employees);
      console.log('✅ All employees added to database!');
      console.log(`📊 Total employees: ${employees.length}`);
    } else {
      console.log(`📊 Database already has ${count} employees`);
    }
  } catch (error) {
    console.error('❌ Error seeding employees:', error.message);
  }
};
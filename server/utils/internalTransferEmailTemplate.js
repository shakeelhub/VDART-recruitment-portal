import fs from 'fs';
import path from 'path';

// Function to convert image to base64
const imageToBase64 = (imagePath) => {
    try {
        const image = fs.readFileSync(imagePath);
        const extension = path.extname(imagePath).slice(1).toLowerCase();
        const mimeType = extension === 'png' ? 'image/png' : 
                        extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                        `image/${extension}`;
        return `data:${mimeType};base64,${image.toString('base64')}`;
    } catch (error) {
        console.error('Error reading image:', error);
        return '';
    }
};

export const generateInternalTransferEmailSignature = (managerDetails) => {
    const {
        name,
        designation,
        mobileNumber,
        managerEmail
    } = managerDetails;

    // Format mobile number with +91 prefix
    const formatPhoneNumber = (mobile) => {
        if (!mobile) return '+91';
        const cleanNumber = mobile.replace(/\D/g, '');
        return `+91 ${cleanNumber}`;
    };

    // Convert images to base64
    const logoBase64 = imageToBase64(path.join(process.cwd(), 'images', 'vdartlogo.png'));
    const firmBase64 = imageToBase64(path.join(process.cwd(), 'images', 'firm.jpg'));

    return `
        <div style="font-family: 'Montserrat', Arial, sans-serif !important; font-size: 12px !important; color: #000000 !important; line-height: 1.2 !important; max-width: 350px; width: 100%; margin: 0 !important; padding: 0 !important;">
            <table cellpadding="0" cellspacing="0" border="0" style="max-width: 350px; width: 100%; border-collapse: collapse !important; table-layout: fixed; border: none !important; margin: 0 !important; padding: 0 !important;">
                <tr>
                    <td style="padding: 0 !important; border: none !important;">
                        <table cellpadding="0" cellspacing="0" border="0" style="width: 100% !important; border-collapse: collapse !important;">
                            <tr>
                                <td width="80" valign="top" style="padding-right: 20px; border: none !important;">
                                    <a target="_blank" style="border: none !important; text-decoration: none !important;">
                                        <img src="${logoBase64}" alt="Trust People" width="90" style="display: block !important; max-width: 110px !important; height: auto !important; border: none !important;">
                                    </a>
                                </td>
                                <td valign="top" style="border: none !important;">
                                    <div style="color: #242299 !important; font-size: 13.33px !important; font-weight: bold !important; margin-bottom: 3px !important; font-family: 'Montserrat', Arial, sans-serif !important;">${name}</div>
                                    <div style="color: #000000 !important; font-size: 10.67px !important; margin-bottom: 6px !important; font-family: 'Montserrat', Arial, sans-serif !important;">${designation}</div>
                                    <div style="font-size: 10.67px !important; margin-bottom: 3px !important; font-family: 'Montserrat', Arial, sans-serif !important;"><span style="font-weight: bold !important; color: #000000 !important;">P:</span> ${formatPhoneNumber(mobileNumber)}</div>
                                    <div style="font-size: 10.67px !important; margin-bottom: 6px !important; font-family: 'Montserrat', Arial, sans-serif !important;"><span style="font-weight: bold !important; color: #000000 !important;">E:</span> <a href="mailto:${managerEmail}" style="color: #0066cc !important; text-decoration: none !important;">${managerEmail}</a></div>
                                    <div>
                                        <a href="https://www.surveymonkey.com/r/Vsupport" style="color: rgb(11, 11, 11) !important; text-decoration: none !important; font-size: 10.67px !important; font-weight: bold !important; font-style: italic !important; font-family: 'Montserrat', Arial, sans-serif !important;">Need help? Click for assistance</a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 0px 0 !important; border: none !important;">
                        <table cellpadding="0" cellspacing="0" border="0" style="max-width: 100%; border-collapse: collapse !important;">
                            <tr>
                                <td>
                                    <div style="background-color: #242299; height: 1px; line-height: 1px; font-size: 0; width: 100%;">&nbsp;</div>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0 0 0 !important; border: none !important;">
                                    <img src="${firmBase64}" alt="Largest staffing Firms in the US" width="100%" style="display: block !important; border: none !important; max-width: 330px; height: auto;">
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding-top: 8px; border: none !important; text-align: center;">
                        <a href="https://www.surveymonkey.com/r/Opout" style="color: #0066cc !important; text-decoration: none !important; font-size: 10px !important; font-family: 'Montserrat', Arial, sans-serif !important;">
                            Unsubscribe
                        </a>
                        <span style="color: #666666 !important; font-size: 10px !important; font-family: 'Montserrat', Arial, sans-serif !important;"> | </span>
                        <a href="https://www.vdart.com/what-we-do/media/vdart-celebrates-five-consecutive-wins-receives-national-supplier-of-the-year-class-iv-award-from-nmsdc" style="color: #0066cc !important; text-decoration: none !important; font-size: 10px !important; font-family: 'Montserrat', Arial, sans-serif !important;">
                            Want to know more About Us?
                        </a>
                    </td>
                </tr>
            </table>
        </div>
    `;
};

export const generateInternalTransferEmailTemplate = (formData, managerDetails, content = '') => {
    const {
        name, empId, role, emailId, office, modeOfHire,
        fromTeam, toTeam, reportingTo, accountManager, deploymentDate
    } = formData;

    const signature = generateInternalTransferEmailSignature(managerDetails);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Internal Transfer Notice</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container { 
                max-width: 1000px; 
                margin: 0 auto; 
                background-color: white;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header { 
                background-color: #3498db;
                color: white; 
                padding: 25px; 
                text-align: center; 
                border-bottom: 3px solid #2980b9;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            .header p {
                margin: 8px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
            }
            .content { 
                padding: 35px; 
            }
            .table-container {
                overflow-x: auto;
                margin: 25px 0;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .transfer-table {
                width: 100%;
                min-width: 900px;
                border-collapse: collapse;
                font-size: 13px;
                border-radius: 4px;
                overflow: hidden;
            }
            .transfer-table th {
                background-color: #2c3e50;
                color: #ffffff;
                padding: 14px 12px;
                text-align: left;
                font-weight: 600;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: none;
                white-space: nowrap;
            }
            .transfer-table td {
                background-color: #ffffff;
                color: #2c3e50;
                padding: 14px 12px;
                border-bottom: 1px solid #ecf0f1;
                font-size: 13px;
                font-weight: 500;
                white-space: nowrap;
            }
            .transfer-table tr:last-child td {
                border-bottom: none;
            }
            .footer { 
                text-align: center; 
                padding: 20px; 
                color: #7f8c8d; 
                font-size: 11px;
                background-color: #ecf0f1;
                border-top: 1px solid #bdc3c7;
            }
            .notice {
                background-color: #e8f4fd;
                border-left: 4px solid #3498db;
                padding: 15px;
                margin: 25px 0;
                font-size: 13px;
                color: #555;
            }
            .company-info {
                text-align: center;
                margin-bottom: 5px;
                font-weight: 600;
            }
            .transfer-highlight {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
                text-align: center;
            }
            .transfer-highlight strong {
                color: #856404;
                font-size: 16px;
            }
            .signature-container {
                margin: 30px 0;
                padding: 20px 0;
                border-top: 1px solid #ecf0f1;
            }
            
            /* Mobile Responsiveness */
            @media only screen and (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 20px;
                }
                .table-container {
                    margin: 15px -20px;
                    border-radius: 0;
                }
                .transfer-table {
                    min-width: 800px;
                    font-size: 12px;
                }
                .transfer-table th,
                .transfer-table td {
                    padding: 10px 8px;
                    font-size: 11px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            
            <div class="content">

                ${content ? `
                <div>
                  <p>${content.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}

                <div class="table-container">
                    <table class="transfer-table">
                        <thead>
                            <tr>
                                <th>Employee Name</th>
                                <th>Employee ID</th>
                                <th>Role</th>
                                <th>Email ID</th>
                                <th>Office</th>
                                <th>Mode of Hire</th>
                                <th>From Team</th>
                                <th>To Team</th>
                                <th>Reporting To</th>
                                <th>Account Manager</th>
                                <th>Transfer Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>${name || 'Not specified'}</strong></td>
                                <td><span style="background-color: #3498db; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${empId || 'Not specified'}</span></td>
                                <td>${role || 'Not specified'}</td>
                                <td>${emailId || 'Not specified'}</td>
                                <td>${office || 'Not specified'}</td>
                                <td>${modeOfHire || 'Not specified'}</td>
                                <td style="background-color: #ffeaa7; font-weight: 600;">${fromTeam || 'Not specified'}</td>
                                <td style="background-color: #d4edda; font-weight: 600; color: #155724;">${toTeam || 'Not specified'}</td>
                                <td>${reportingTo || 'Not specified'}</td>
                                <td>${accountManager || 'Not specified'}</td>
                                <td><strong>${deploymentDate ? new Date(deploymentDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'Not specified'}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="notice">
                   
                </div>

                <div class="signature-container">
                    ${signature}
                </div>
            </div>

        </div>
    </body>
    </html>
    `;
};
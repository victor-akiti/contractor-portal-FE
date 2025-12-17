# Amni Contractor Portal - User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Contractor Portal Guide](#contractor-portal-guide)
4. [Staff Portal Guide](#staff-portal-guide)
5. [Administrator Guide](#administrator-guide)
6. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Introduction

### What is the Amni Contractor Portal?

The Amni Contractor Portal is a comprehensive platform for managing contractor registration, verification, and approval processes. It provides a streamlined workflow for:

- **Contractors/Vendors**: Submit registration applications, manage profiles, track certificate expiry dates, and communicate with staff
- **Staff Members**: Review and approve contractor registrations through a multi-stage approval workflow
- **Administrators**: Manage users, create custom forms, configure system settings, and oversee operations

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, or Edge - latest version recommended)
- Active internet connection
- Valid email address for account registration

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Contractor/Vendor** | External companies registering with Amni | Contractor Portal |
| **Portal Admin** | Primary contact for vendor company | Contractor Portal + Settings |
| **Staff User** | Internal employee with limited access | Staff Portal (view-only) |
| **Supervisor** | Supervisory level staff | Staff Portal (limited approvals) |
| **VRM** | Vendor Risk Manager | Stage B approvals |
| **CO** | Contracts Officer | Stage B/C approvals |
| **HOD** | Head of Department | Stage A, E approvals + oversight |
| **GM** | General Manager | Stage D approvals |
| **Executive Approver** | Executive level | Stage D approvals |
| **C&P Admin** | Contracts & Procurement Admin | Full staff access |
| **Admin** | System Administrator | Full system access |

---

## Getting Started

### For Contractors

#### 1. Receiving Your Invitation

You will receive an email invitation from Amni with a unique registration link. This link will look like:
```
https://portal.amni.com/register/[unique-hash]
```

**Important**: This link is unique to your company and expires after a certain period. If your link expires, contact Amni staff to request a new invitation.

#### 2. Creating Your Account

1. Click the registration link in your invitation email
2. Enter your personal information:
   - First Name
   - Last Name
   - Email Address (this will be your login username)
   - Phone Number
3. Create a secure password:
   - Minimum 8 characters
   - Must include uppercase and lowercase letters
   - Must include at least one number
4. Review and accept the Terms & Conditions
5. Acknowledge the NDPR (Non-Disclosure/Privacy Policy)
6. Click "Create Account"

#### 3. First Login

1. Navigate to the contractor login page
2. Enter your email and password
3. Optionally check "Remember me" to stay logged in
4. Click "Login"

### For Staff Members

#### 1. Receiving Access

Your administrator will create your staff account and provide you with:
- Your email address (login username)
- Initial password
- Your assigned role and permissions

#### 2. First Login

1. Navigate to the staff login page at `/login/staff`
2. Enter your email and password
3. Click "Login"
4. You will be prompted to change your password on first login (recommended)

#### 3. Password Reset

If you forget your password:
1. Click "Forgot Password" on the login page
2. Enter your email address
3. Check your email for a password reset link
4. Follow the link and create a new password

---

## Contractor Portal Guide

### Dashboard Overview

After logging in, you'll see your contractor dashboard with:

- **Company Registrations**: Overview of all your registered companies
- **Certificate Status**:
  - Expiring certificates (within 30 days)
  - Expired certificates
- **File Manager**: Quick access to uploaded documents
- **Action Buttons**: Renew certificates, view applications

### Navigation

The contractor portal uses a top navigation bar with:

- **Logo/Dashboard**: Click to return to dashboard
- **Messages**: View communications from staff (icon in top-right)
- **User Menu**: Access settings and logout (click your name/avatar)

### Filling Out Registration Forms

#### Starting a New Application

1. From your dashboard, click "Start New Registration" or "Continue Application"
2. You'll be directed to a multi-page form based on your contractor type

#### Understanding the Form Layout

- **Progress Bar**: Shows your completion progress across all pages
- **Sections**: Forms are organized into collapsible sections
- **Required Fields**: Marked with a red asterisk (*)
- **Help Text**: Hover over the "?" icon for field guidance

#### Field Types You'll Encounter

| Field Type | Description | Example |
|------------|-------------|---------|
| Text Input | Single line text entry | Company Name |
| Text Area | Multi-line text entry | Company Description |
| Dropdown | Select from predefined options | Country Selection |
| File Upload | Upload documents/certificates | Business License |
| Certificate | File with expiry date tracking | Insurance Certificate |
| Checkbox | Yes/No or multiple selections | Service Categories |
| Rich Text | Formatted text editor | Company Profile |

#### Uploading Documents

1. Click the "Choose File" or upload button
2. Select your file from your computer
3. **Allowed formats** are shown below each upload field (e.g., PDF, JPG, PNG)
4. **File size limit**: Usually 5MB per file
5. Wait for the upload to complete (you'll see a progress indicator)

**Best Practices**:
- Use clear, descriptive filenames
- Ensure documents are legible and complete
- Upload all pages for multi-page documents
- Keep file sizes reasonable by compressing if necessary

#### Certificate Management

When uploading certificates with expiry dates:

1. Upload the certificate document
2. Enter the expiry date in the date picker
3. System will track and notify you of expiring certificates
4. You can update certificates before expiry through your dashboard

#### Saving Your Progress

- **Auto-save**: Forms automatically save your progress every few minutes
- **Manual Save**: Click "Save Draft" to save immediately
- **Resuming**: Return to your dashboard and click "Continue Application" to resume

#### Submitting Your Application

1. Complete all required fields across all form pages
2. Review your entries carefully
3. Click "Next" to progress through pages
4. On the final page, click "Submit Application"
5. You'll receive a confirmation message and notification email

**Important**: Once submitted, you cannot edit your application unless staff returns it to you for revisions.

### Viewing Your Applications

1. Go to Dashboard
2. Click "View Application" on any submitted registration
3. Review your submitted information in an organized, accordion-based layout
4. Check the approval status at the top

### Managing Certificates

#### Viewing Certificate Status

From your dashboard:
- **Expiring Soon**: Certificates expiring within 30 days (shown in yellow)
- **Expired**: Past expiry date (shown in red)
- **Valid**: All other certificates (shown in green)

#### Renewing Certificates

1. Click "Renew Certificate" on the dashboard alert
2. Upload the updated certificate document
3. Enter the new expiry date
4. Click "Update"
5. System will update your application with the new certificate

### Settings

Access settings by clicking your name in the top-right and selecting "Settings".

#### Portal Administrator Profile

- View your administrator details
- Update contact information
- Change password

#### Request Administrator Replacement

If you need to transfer portal administrator duties:
1. Go to Settings
2. Click "Request Administrator Replacement"
3. Provide the new administrator's information
4. Submit request for staff approval

### Messages

Access the messaging center by clicking the messages icon (top-right):
- View communications from staff
- Respond to questions or revision requests
- Track conversation history

---

## Staff Portal Guide

### Dashboard Overview

The staff portal provides access to all administrative functions through a sidebar navigation.

### Navigation

The staff sidebar includes:

- **Dashboard**: Overview and quick stats
- **Registration Approvals**: Main approval workflow
- **Registration Invites**: Invite management
- **Forms**: Form management and responses
- **Form Builder**: Create/edit registration forms
- **Job Categories**: Manage contractor specializations
- **Invoice Forms**: DocuWare invoice management
- **Events**: Activity audit log
- **User Management**: Staff and role management (Admin only)
- **Settings**: Personal settings and out-of-office

### Registration Approval Workflow

#### Understanding the Approval Stages

The system uses a 6-stage approval process (A through F):

| Stage | Level | Typical Role | Description |
|-------|-------|--------------|-------------|
| **A** | 0 | Admin, HOD | Initial document review |
| **B** | 1 | VRM, CO | Department/risk review |
| **C** | 2 | CO, GM | Service verification |
| **D** | 3 | Executive | Executive business review |
| **E** | 4 | Admin, HOD | Final verification |
| **F** | 5 | Admin | Completion and activation |

#### Accessing Registration Approvals

1. Click "Registration Approvals" in the sidebar
2. You'll see multiple tabs:
   - **Pending L2**: New applications awaiting review
   - **Completed L2**: Applications that passed initial stages
   - **Returned to Contractor**: Applications sent back for revisions
   - **In Progress**: Applications currently being reviewed
   - **L3**: Escalations requiring higher-level review
   - **Invited Contractors**: Track invitation status
   - **Park Requests**: Applications on hold pending decisions

#### Reviewing an Application

1. Navigate to the appropriate tab
2. Find the application (use search/filter if needed)
3. Click "View" or the application row to open details
4. Review all sections carefully:
   - Company information
   - Documents and certificates
   - Services offered
   - References
   - Financial information

#### Taking Action on Applications

##### Approve and Move to Next Stage

1. Review all required documents
2. Verify information is complete and accurate
3. Add any remarks or conditions in the comments box
4. Click "Approve" or "Move to Stage [X]"
5. Application advances to the next approval stage

##### Return to Contractor for Revisions

1. Identify sections that need correction
2. Click on the section to add remarks
3. Specify exactly what needs to be changed
4. Click "Return to Contractor" button
5. Contractor receives notification with your feedback

**Important**: The system prevents double-clicking to avoid duplicate returns/processes.

##### Park Application

If you need more time or information before deciding:
1. Click "Park Request" button
2. Add a reason for parking
3. Application moves to "Park Requests" tab
4. Later, approve or decline the park request

##### Revert to L2

If an application at a higher stage needs to go back:
1. Click "Revert to L2" button
2. Select the specific stage to revert to
3. Add a reason for reversion
4. Confirm action

#### Working with End-Users

At certain stages, you can assign specific end-users to review documents:

1. In the approval view, find "Assign End-Users" section
2. Select users who need to review specific documents
3. End-users will receive notification
4. Track their review status
5. Proceed with approval once end-users complete review

#### Search and Filter

- **Search**: Enter company name, email, or application ID in the search box
- **Filters**: Use dropdown filters to narrow by status, date range, or other criteria
- **Sort**: Click column headers to sort (name, date, status, etc.)

#### Exporting Data

1. Navigate to the tab you want to export
2. Click "Export to Excel" button
3. System generates an Excel file with all displayed applications
4. File downloads automatically

### Invitation Management

#### Creating New Invitations

1. Click "Registration Invites" in the sidebar
2. Click "Create New Invite" or "Send Invitation"
3. Fill in contractor details:
   - Company Name
   - Contact Person Name
   - Email Address
   - Phone Number (optional)
   - Recommended by (your name/department)
4. Click "Send Invitation"
5. Contractor receives email with registration link

#### Managing Invitations

View all invitations in the following tabs:
- **Active**: Currently valid invitations
- **Expired**: Invitations past expiry date
- **Used**: Invitations where contractor completed registration
- **Archived**: Invitations no longer active

#### Renewing Expired Invitations

1. Go to "Expired" tab
2. Find the invitation
3. Click "Renew" button
4. New invitation email is sent with extended expiry

#### Sending Reminders

1. Find the active invitation
2. Click "Send Reminder" button
3. Contractor receives follow-up email

#### Archiving Invitations

1. Find the invitation to archive
2. Click "Archive" button
3. Confirm action
4. Invitation moves to "Archived" tab

### Form Management

#### Viewing All Forms

1. Click "Forms" in the sidebar
2. See list of all registration forms
3. View creation date and creator information

#### Viewing Form Responses

1. Click on a form in the list
2. View all responses submitted for that form
3. Click on a specific response to view details
4. Export responses to Excel if needed

#### Duplicating Forms

1. Find the form you want to copy
2. Click "Duplicate" button
3. New copy is created with "_copy" suffix
4. Edit the duplicated form as needed

#### Deleting Forms

1. Find the form to delete
2. Click "Delete" button
3. Confirm deletion (this action cannot be undone)
4. **Note**: Only delete forms with no active responses

### Job Categories

Manage contractor specializations and service categories:

1. Click "Job Categories" in the sidebar
2. View all available categories
3. Add new categories as needed
4. Associate categories with contractors
5. Use for filtering and reporting

### Invoice Forms (DocuWare Integration)

1. Click "Invoice Forms" in the sidebar
2. View all invoice documents from DocuWare
3. Use filters to find specific invoices
4. Copy field data using the copy button
5. Manage end-users for invoice approvals

### Events (Audit Log)

Track all system activities:

1. Click "Events" in the sidebar
2. View chronological list of all activities:
   - User logins
   - Application submissions
   - Approvals and returns
   - Form changes
   - User management actions
3. Filter by:
   - Date range
   - Company name
   - User
   - Event type
4. Search for specific events
5. Export event log if needed

### Personal Settings

#### Setting Out-of-Office Status

1. Click "Settings" in the sidebar
2. Toggle "Out of Office" switch
3. Select date range (from/to dates)
4. Optionally assign a substitute/delegate
5. Save settings

**What happens when you're out of office**:
- Your approvals are delegated to your substitute
- Your profile shows out-of-office indicator
- Notifications are forwarded appropriately

#### Changing Your Password

1. Go to Settings
2. Click "Change Password"
3. Enter current password
4. Enter new password
5. Confirm new password
6. Save

---

## Administrator Guide

### User Management

Administrators have full control over user accounts and permissions.

#### Accessing User Management

1. Click "User Management" in the sidebar (Admin only)
2. View all staff users in the system

#### Creating New Staff Accounts

1. Click "Create New User" or "Add Staff"
2. Enter user details:
   - First Name
   - Last Name
   - Email Address
   - Phone Number
   - Department
3. Assign Role:
   - Admin
   - HOD
   - Executive Approver
   - VRM
   - CO
   - GM
   - Supervisor
   - User
   - C&P Admin
   - IT Admin
4. Set initial password (user should change on first login)
5. Click "Create User"

#### Editing User Accounts

1. Find the user in the list
2. Click "Edit" button
3. Update any field except email (email is unique identifier)
4. Change role if needed
5. Save changes

#### Deactivating Users

1. Find the user to deactivate
2. Click "Deactivate" or "Delete" button
3. Confirm action
4. User can no longer log in

**Best Practice**: Deactivate instead of deleting to preserve audit trail.

#### Managing End-Users

End-users have specific document review permissions:
1. Navigate to End-Users section
2. Create end-user accounts
3. Assign to specific approval stages
4. Grant document-specific access
5. Track review completions

### Form Builder

Create and customize registration forms for contractors.

#### Creating a New Form

1. Click "Form Builder" in the sidebar
2. Click "Create New Form" or "New Form"
3. Enter form details:
   - Form Name
   - Description
   - Form Type/Category
4. Click "Create"

#### Designing Form Structure

##### Adding Pages

1. Click "Add Page" button
2. Enter page name
3. Set page order
4. Configure page settings

##### Adding Sections

1. Select a page
2. Click "Add Section"
3. Enter section title
4. Choose layout:
   - Single column
   - Two columns
   - Three columns
5. Add help text (optional)

##### Adding Fields

1. Select a section
2. Click "Add Field"
3. Choose field type:
   - **Text Input**: Short text entry
   - **Text Area**: Long text entry
   - **Dropdown**: Single selection from list
   - **Checkbox**: Yes/No or multiple options
   - **File Upload**: Document upload
   - **Certificate**: File with expiry date
   - **Rich Text**: Formatted text editor
4. Configure field properties:
   - Label
   - Help text
   - Required/Optional
   - Validation rules
   - Default value
5. For file uploads:
   - Allowed file formats (PDF, JPG, PNG, etc.)
   - Maximum file count
   - File size limit
6. Click "Save Field"

#### Field Configuration Options

| Property | Description | Example |
|----------|-------------|---------|
| Label | Field name shown to user | "Business License Number" |
| Help Text | Guidance text | "Enter your 10-digit license number" |
| Required | Must be filled to submit | Yes/No |
| Validation | Rules for valid input | Email format, phone format |
| Default Value | Pre-filled value | Current year |
| Placeholder | Example text in empty field | "e.g., +234-xxx-xxx-xxxx" |
| Conditional Display | Show based on other fields | Show if "Has Insurance" is Yes |

#### Duplicating Sections

1. Find the section to duplicate
2. Click "Duplicate Section" button
3. New copy appears below original
4. Edit as needed

#### Duplicating Fields

1. Find the field to duplicate
2. Click duplicate icon
3. New copy appears below original
4. Modify properties as needed

#### Reordering Elements

- Drag and drop sections to reorder within a page
- Drag and drop fields to reorder within a section
- Use up/down arrows if drag-and-drop is not available

#### Previewing Forms

1. Click "Preview" button
2. View form as contractors will see it
3. Test field validation
4. Check layout and flow
5. Return to edit mode to make changes

#### Publishing Forms

1. Complete form design
2. Review all pages, sections, and fields
3. Click "Publish" or "Activate"
4. Form becomes available for contractor use

**Important**: Published forms should not be significantly altered if responses exist. Create a new version instead.

### Permissions Management

Configure role-based permissions (if available):

1. Click "Permissions" in the sidebar
2. Select a role
3. Configure access levels for:
   - Read access
   - Write/edit access
   - Delete access
   - Approval authority
4. Set stage-specific permissions
5. Save permission changes

### System Configuration

#### Managing Roles

Define what each role can do:
- Access to specific modules
- Approval authority levels
- Export capabilities
- User management rights

#### Department Management

Organize users by department:
- Create departments
- Assign users to departments
- Set department-level permissions
- Configure departmental workflows

---

## Troubleshooting & FAQs

### Common Issues

#### Login Problems

**Problem**: "Invalid email or password" error

**Solution**:
1. Verify email is correct (check for typos)
2. Ensure password is correct (case-sensitive)
3. Use "Forgot Password" to reset if needed
4. Clear browser cache and cookies
5. Try a different browser

**Problem**: Password reset link not received

**Solution**:
1. Check spam/junk folder
2. Wait 5-10 minutes for email delivery
3. Verify email address is correct in the system
4. Contact administrator if still not received

#### Form Submission Issues

**Problem**: Cannot submit form - "Please complete all required fields"

**Solution**:
1. Scroll through all form pages
2. Look for red asterisks (*) marking required fields
3. Check for error messages below fields
4. Ensure all file uploads completed successfully
5. Verify certificate expiry dates are entered

**Problem**: File upload fails

**Solution**:
1. Check file format is allowed (shown below upload field)
2. Verify file size is under limit (usually 5MB)
3. Ensure file is not corrupted
4. Try uploading from a different location
5. Check internet connection stability

#### Application Status Issues

**Problem**: Application stuck at a stage for long time

**Solution**:
1. Check if any additional information was requested
2. Review messages for staff feedback
3. Verify all certificates are valid (not expired)
4. Contact staff via messaging system
5. Staff may have parked application - contact them for status

### Frequently Asked Questions

#### For Contractors

**Q: How long does the approval process take?**

A: Approval time varies based on application complexity and completeness. Typically:
- Simple applications: 5-10 business days
- Complex applications: 15-30 business days
- Applications returned for revisions: Additional 5-7 days per revision

**Q: Can I edit my application after submission?**

A: No, once submitted you cannot edit. If changes are needed, staff will return your application to you with specific instructions on what to update.

**Q: What file formats are accepted?**

A: Commonly accepted formats include:
- Documents: PDF, DOC, DOCX
- Images: JPG, JPEG, PNG
- Specific formats are shown below each upload field

**Q: How do I know if my application is approved?**

A: You'll receive email notifications at each stage. Check your dashboard for current status. When fully approved, status will show "Completed" or "Active".

**Q: What happens when my certificate expires?**

A: You'll receive notifications 30 days before expiry. After expiry, you must upload a renewed certificate through your dashboard. Your contractor status may be suspended until certificate is updated.

**Q: Can I submit multiple registrations?**

A: Yes, you can register multiple companies or branches using the same portal account. Each will have a separate application and approval workflow.

#### For Staff

**Q: What if I accidentally returned an application?**

A: Contact an administrator immediately. They may be able to use "Revert to L2" to restore the application to the correct stage.

**Q: Can I approve applications outside my role's stage?**

A: No, the system enforces role-based permissions. You can only approve at stages assigned to your role.

**Q: How do I know when new applications arrive?**

A: Check the "Pending L2" tab regularly. The number badge shows count of pending applications. You may also receive email notifications (if configured).

**Q: What should I do if an application is incomplete?**

A: Return it to the contractor with specific, clear instructions on what needs to be completed or corrected. Be as detailed as possible to avoid multiple revision cycles.

**Q: Can I delete an application?**

A: No, applications cannot be deleted to maintain audit trail. You can archive invitations that were never used.

**Q: How do I track my approval history?**

A: Use the Events/Audit Log to see all your approval actions with timestamps.

#### For Administrators

**Q: Can I change a user's role after creation?**

A: Yes, edit the user account and change the role assignment. Changes take effect on next login.

**Q: What happens to applications when I delete a form?**

A: Existing applications remain intact with their submitted data. However, do not delete forms that have active applications.

**Q: Can I restore a deactivated user?**

A: Yes, edit the user and reactivate their account. Their history and permissions remain intact.

**Q: How do I back up the system?**

A: Contact your IT administrator or system administrator for database backup procedures.

**Q: Can I customize approval stages?**

A: Approval stages (A-F) are built into the system. Contact your system administrator if you need to modify the approval workflow.

### Getting Help

#### Support Channels

1. **Email Support**: [Add your support email]
2. **Phone Support**: [Add your support phone]
3. **Help Desk**: [Add help desk system]
4. **Documentation**: This user manual and online help resources

#### Reporting Bugs

If you encounter a technical issue:
1. Note exactly what you were doing when the issue occurred
2. Take a screenshot if possible
3. Note any error messages
4. Report to support with:
   - Your username/email
   - Date and time of issue
   - Steps to reproduce
   - Browser and device information

#### Feature Requests

To suggest new features or improvements:
1. Document your suggestion clearly
2. Explain the business need
3. Submit through appropriate channel (help desk, email, etc.)
4. Administrators will review and prioritize

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Application** | A contractor's registration submission |
| **Approval Stage** | One of six stages (A-F) in the approval workflow |
| **Certificate** | A document with an expiry date (license, insurance, etc.) |
| **Contractor** | External vendor/supplier registering with Amni |
| **End-User** | Staff member with document-specific review permissions |
| **Hash** | Unique identifier in invitation URLs |
| **Park Request** | Temporarily holding an application pending decision |
| **Portal Admin** | Primary contact person for a contractor company |
| **Revert to L2** | Moving an application back to a previous stage |
| **Return to Contractor** | Sending application back for revisions |
| **Section** | Group of related fields in a form |
| **Stage** | See Approval Stage |
| **Vendor** | See Contractor |

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save Draft | Ctrl + S (may vary) |
| Submit Form | Enter (on submit button) |
| Navigate Forms | Tab (forward), Shift+Tab (backward) |
| Logout | Available through user menu |

### Contact Information

**Amni International**
- Website: [Add website]
- Email: [Add general contact email]
- Phone: [Add phone number]
- Address: [Add physical address]

**Technical Support**
- Email: [Add support email]
- Phone: [Add support phone]
- Hours: [Add support hours]

---

**Document Version**: 1.0
**Last Updated**: December 2025
**Maintained By**: Amni International IT Department

For the most current version of this documentation, please visit [documentation URL or contact IT support].

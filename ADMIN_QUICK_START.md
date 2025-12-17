# Administrator Quick Start Guide

## Welcome, System Administrator!

This guide covers the key administrative tasks for managing the Amni Contractor Portal.

---

## Administrator Responsibilities

As an administrator, you have full system access to:

- **User Management**: Create/edit staff accounts, manage roles and permissions
- **Form Builder**: Design and customize contractor registration forms
- **System Configuration**: Manage departments, job categories, and settings
- **Full Approval Authority**: Approve at all stages (A through F)
- **Data Management**: Export, archive, and manage system data
- **Audit & Oversight**: Monitor system activity and user actions

---

## Quick Start Checklist

### Day 1 Setup
- [ ] Log in with admin credentials
- [ ] Review existing users and their roles
- [ ] Check active forms and their configuration
- [ ] Review pending approvals
- [ ] Familiarize yourself with Events/audit log
- [ ] Update your personal settings and password

### Week 1 Tasks
- [ ] Create test user account to understand user creation
- [ ] Review all approval stages and workflows
- [ ] Check contractor invitations and their status
- [ ] Explore form builder capabilities
- [ ] Set up any needed departments or job categories
- [ ] Review system activity in Events log

---

## Essential Admin Tasks

## 1. User Management

### Creating New Staff Accounts

**Navigation**: Sidebar → User Management

1. Click **"Create New User"** or **"Add Staff"**
2. Enter user details:
   ```
   - First Name: John
   - Last Name: Smith
   - Email: john.smith@amni.com (becomes username)
   - Phone: +234-xxx-xxx-xxxx
   - Department: Procurement
   ```
3. **Assign Role**:
   - **Admin**: Full system access (your role)
   - **HOD**: Head of Department - Stage A, E approvals
   - **VRM**: Vendor Risk Manager - Stage B approvals
   - **CO**: Contracts Officer - Stage B, C approvals
   - **GM**: General Manager - Stage C, D approvals
   - **Executive Approver**: Stage D approvals
   - **Supervisor**: Supervisory level
   - **User**: Limited/view-only access
   - **C&P Admin**: Contracts & Procurement Admin
   - **IT Admin**: IT system administration

4. Set **initial password**
   - Give to user securely
   - Instruct them to change on first login

5. Click **"Create User"**

**Best Practice**:
- Use company email addresses only
- Assign minimum role needed (principle of least privilege)
- Document why each user needs their assigned role

### Editing User Accounts

1. Find user in User Management list
2. Click **"Edit"** button
3. Update any field **except email** (email is permanent identifier)
4. Can change:
   - Name, phone, department
   - **Role** (upgrades/downgrades permissions)
   - Password (if user forgot theirs)
5. Click **"Save Changes"**

### Deactivating Users

**When to deactivate**:
- Employee leaves company
- Role no longer needed
- Temporary suspension

**How**:
1. Find user in list
2. Click **"Deactivate"** or **"Delete"**
3. Confirm action
4. User can no longer log in

**Important**: Deactivate instead of delete to preserve audit trail!

### Managing End-Users

End-users have specific document review permissions:

1. Navigate to **End-Users** section in User Management
2. Click **"Create End-User"**
3. Enter details and assign permissions
4. Associate with specific approval stages
5. Grant document-specific access

**Use case**: Technical specialists who only review specific certificates/documents.

### Role-Based Access Summary

| Role | Approval Stages | User Management | Form Builder | Invites | Events |
|------|----------------|-----------------|--------------|---------|--------|
| Admin | All (A-F) | Full | Full | Full | Full |
| HOD | A, E | View | View | Full | Full |
| Executive | D | No | No | Limited | View |
| VRM | B | No | No | Limited | View |
| CO | B, C | No | No | Limited | View |
| GM | C, D | No | No | Limited | View |
| Supervisor | Varies | No | No | Limited | View |
| User | None | No | No | No | View |

---

## 2. Form Builder

### Creating Registration Forms

**Navigation**: Sidebar → Form Builder

#### Starting a New Form

1. Click **"Create New Form"**
2. Enter form details:
   ```
   Form Name: General Contractor Registration
   Description: Standard registration for contractors
   Form Type: Contractor
   ```
3. Click **"Create"**

#### Building Form Structure

**Forms → Pages → Sections → Fields**

##### Adding Pages

1. Click **"Add Page"**
2. Enter page name (e.g., "Company Information", "Documents", "Financial Details")
3. Set page order (1, 2, 3...)
4. Click **"Save"**

**Tip**: Organize into 3-7 pages for best user experience.

##### Adding Sections to Pages

1. Select a page
2. Click **"Add Section"**
3. Configure:
   ```
   Section Title: Business Registration Details
   Layout: Single column (or Two column, Three column)
   Help Text: (optional guidance)
   ```
4. Click **"Save"**

**Layout options**:
- **Single column**: One field per row (best for long text, file uploads)
- **Two column**: Two fields side-by-side (efficient for short fields)
- **Three column**: Three fields side-by-side (compact, use sparingly)

##### Adding Fields to Sections

1. Select a section
2. Click **"Add Field"**
3. Choose **field type**:

**Available Field Types**:

| Type | Best For | Example |
|------|----------|---------|
| **Text Input** | Short text entry | Company name, registration number |
| **Text Area** | Long text entry | Company description, business summary |
| **Dropdown** | Single selection | Country, industry type |
| **Checkbox** | Yes/No or multiple options | Services offered, certifications |
| **File Upload** | Documents | Business license, contracts |
| **Certificate** | Files with expiry dates | Insurance, professional licenses |
| **Rich Text** | Formatted text | Detailed company profile |
| **Date** | Date selection | Establishment date |
| **Number** | Numeric values | Employee count, annual revenue |
| **Email** | Email addresses | Contact email |
| **Phone** | Phone numbers | Company phone |

4. Configure field properties:
   ```
   Label: Business Registration Number
   Help Text: Enter your 10-digit registration number
   Required: Yes (checkbox)
   Validation: Numeric only
   Placeholder: e.g., 1234567890
   Default Value: (leave blank)
   ```

5. For **File Upload** fields, specify:
   ```
   Allowed Formats: PDF, JPG, PNG
   Maximum Files: 3
   File Size Limit: 5MB
   ```

6. For **Certificate** fields:
   ```
   Document Type: Professional License
   Require Expiry Date: Yes
   Expiry Notification: 30 days before
   ```

7. Click **"Save Field"**

#### Field Configuration Best Practices

**Labels**:
- Clear and descriptive
- Use proper capitalization
- Avoid abbreviations unless common

**Help Text**:
- Provide examples
- Explain what's required
- Clarify any ambiguity

**Validation**:
- Email format for email fields
- Phone format for phone fields
- Numeric only for numbers
- Min/max length where appropriate

**Required vs Optional**:
- Mark only truly necessary fields as required
- Too many required fields = frustration
- Balance completeness with user burden

#### Advanced Features

##### Conditional Display

Show/hide fields based on other field values:

```
If "Has Insurance" = Yes
  Then show: Insurance Certificate upload field
  Then show: Insurance Expiry Date
```

**How to set up**:
1. Create the conditional fields
2. In field settings, set "Display Condition"
3. Select trigger field and value
4. Save

##### Field Validation Rules

Custom validation beyond basic types:

- Min/max character length
- Specific formats (regex)
- Number ranges
- Date ranges
- Custom error messages

##### Duplicating Elements

**Duplicate Section**:
1. Find section to copy
2. Click **"Duplicate Section"**
3. New copy appears below
4. Edit title and fields as needed

**Duplicate Field**:
1. Find field to copy
2. Click duplicate icon
3. New copy appears below
4. Modify properties

**Use case**: Creating similar sections (e.g., multiple reference forms).

#### Organizing Form Elements

**Reordering**:
- **Drag and drop** pages, sections, or fields
- Or use **up/down arrow** buttons
- Logical order improves completion rates

**Best flow**:
1. Basic company info (easy fields first)
2. Detailed information
3. Document uploads
4. Declarations/agreements
5. Final review/submit

#### Previewing Forms

1. Click **"Preview"** button
2. View as contractors will see it
3. Test:
   - Field validation
   - Required field enforcement
   - File upload functionality
   - Layout on different screen sizes
4. Return to edit mode to adjust

#### Publishing Forms

1. Complete all form design
2. Review carefully (changes after publishing = problematic)
3. Click **"Publish"** or **"Activate"**
4. Form becomes available for contractor use

**Important**: Avoid major changes to published forms with existing responses. Create new version instead.

### Viewing Form Responses

1. Sidebar → Forms
2. Click on a form name
3. See all responses submitted
4. Click individual response to view details
5. Export responses to Excel for analysis

### Duplicating Forms

Create variations of existing forms:

1. Find form to copy
2. Click **"Duplicate"**
3. New copy created with "_copy" suffix
4. Edit as needed
5. Publish when ready

**Use case**: Creating specialized forms for different contractor types based on a standard template.

### Deleting Forms

**⚠️ Use with extreme caution!**

1. Ensure form has **no active responses**
2. Find form in list
3. Click **"Delete"**
4. Confirm deletion
5. Form permanently removed

**Best Practice**: Archive instead of delete when possible.

---

## 3. Managing Job Categories

**Navigation**: Sidebar → Job Categories

Job categories classify contractor specializations.

### Adding Categories

1. Click **"Add Category"** or **"Create New"**
2. Enter:
   ```
   Category Name: Electrical Services
   Description: Electrical installation, maintenance, repair
   Code: ELEC-01 (optional)
   ```
3. Click **"Save"**

### Editing Categories

1. Find category in list
2. Click **"Edit"**
3. Update details
4. Save

### Associating with Contractors

1. Open contractor application
2. Find "Job Categories" section
3. Select applicable categories
4. Save

**Use for**:
- Filtering contractors by specialization
- Reporting
- Matching contractors to projects

---

## 4. Invitation Management

Administrators can create, manage, and track all invitations.

### Bulk Invitations

If you need to invite many contractors:

1. Go to Registration Invites
2. Consider creating a spreadsheet with:
   - Company names
   - Contact persons
   - Email addresses
3. Send invitations individually (or request bulk import feature)

### Monitoring Invitation Status

1. Check tabs regularly:
   - **Active**: Follow up if no response after 7 days
   - **Expired**: Renew if still relevant
   - **Used**: Verify applications submitted
   - **Archived**: Clean up periodically

### Invitation Best Practices

- Send invitations during business hours
- Include clear instructions in email
- Follow up after 7 days if no response
- Renew expired invites promptly if needed
- Archive old, unused invitations

---

## 5. Approval Oversight

As admin, you can:

- Approve at **all stages** (A through F)
- **Revert applications** to previous stages
- **Unpark parked applications**
- **Override decisions** (use judiciously)

### Handling Stuck Applications

If an application isn't moving:

1. Check Events log to see last action
2. Identify which stage it's at
3. Check if assigned reviewer is out-of-office
4. Reassign or take action yourself if needed

### Using Revert to L2

**When to use**:
- Critical error discovered at later stage
- Need to go back for major revisions
- Wrong approval path taken

**How**:
1. Open application
2. Click **"Revert to L2"**
3. Select target stage
4. Add detailed reason
5. Confirm

**Important**: Document why you're reverting in the reason field!

### Managing Park Requests

Applications on hold pending decisions:

1. Go to **Park Requests** tab
2. Review each parked application
3. Determine if issue resolved
4. **Approve** to continue, or **Decline** to send back
5. Add notes about resolution

---

## 6. Events & Audit Log

**Navigation**: Sidebar → Events

Monitor all system activity:

### What's Tracked

- User logins/logouts
- Application submissions
- Approvals, returns, reverts
- Form creations/edits
- User account changes
- Invitation activities
- Settings changes

### Using Events for Administration

**Daily monitoring**:
1. Check for unusual activity
2. Verify critical actions taken
3. Monitor approval bottlenecks

**Investigating issues**:
1. Search for specific application ID
2. Filter by user to see their activity
3. Filter by date range for specific period
4. Track down who did what and when

**Compliance reporting**:
1. Export event log for specific period
2. Filter by event type
3. Generate audit reports

### Event Filters

- **Date range**: Specific period
- **User**: Specific person's actions
- **Company**: All activity for one contractor
- **Event type**: Logins, approvals, changes, etc.

---

## 7. System Maintenance

### Regular Tasks

**Daily**:
- [ ] Check pending approvals count
- [ ] Review Events for issues
- [ ] Monitor active invitations
- [ ] Check for urgent messages

**Weekly**:
- [ ] Review user activity
- [ ] Check expired certificates
- [ ] Monitor approval bottlenecks
- [ ] Clean up expired invitations
- [ ] Verify backups completed

**Monthly**:
- [ ] Export data for reports
- [ ] Review user access (remove unnecessary permissions)
- [ ] Archive old applications
- [ ] Update forms if needed
- [ ] Review system performance
- [ ] User access audit

**Quarterly**:
- [ ] Comprehensive audit of all users
- [ ] Review and update documentation
- [ ] System health check
- [ ] Performance optimization
- [ ] Security review

### Data Export & Backup

**Exporting Data**:
- Approvals: Export from each tab
- Events: Export full audit log
- Forms: Export responses per form
- Users: Export user list

**File formats**: Usually Excel (.xlsx)

**Backup procedures**:
1. Coordinate with IT for database backups
2. Export critical data regularly
3. Store exports securely
4. Test restoration procedures
5. Document backup schedule

### Troubleshooting Common Issues

#### Users Can't Log In

**Diagnose**:
1. Check if account exists
2. Verify account is active (not deactivated)
3. Check if password reset needed
4. Verify email address is correct

**Fix**:
1. Reset password if forgotten
2. Reactivate if deactivated
3. Correct email if typo
4. Create account if doesn't exist

#### Applications Not Moving Through Stages

**Diagnose**:
1. Check Events log for last action
2. Identify current stage
3. Check if reviewer is out-of-office
4. Verify reviewer has correct permissions

**Fix**:
1. Notify reviewer
2. Reassign to another user
3. Approve yourself if urgent
4. Check if parked

#### Form Not Displaying Correctly

**Diagnose**:
1. Preview form as user sees it
2. Check field configuration
3. Verify conditional logic
4. Test on different browsers

**Fix**:
1. Edit form configuration
2. Fix conditional display rules
3. Adjust layout settings
4. Clear browser cache and test

#### End-User Can't Review Documents

**Diagnose**:
1. Verify end-user account exists
2. Check if assigned to application
3. Verify permissions granted
4. Check if documents uploaded

**Fix**:
1. Create/activate end-user account
2. Assign to application
3. Grant appropriate permissions
4. Ensure documents are uploaded

---

## 8. Security Best Practices

### Password Management

**For your admin account**:
- Use strong, unique password (16+ characters)
- Change every 60-90 days
- Never share credentials
- Use password manager
- Enable two-factor auth (if available)

**For user accounts**:
- Set strong initial passwords
- Require password change on first login
- Enforce password complexity rules
- Monitor for failed login attempts

### Access Control

**Principle of least privilege**:
- Grant minimum access needed
- Review permissions regularly
- Remove access when no longer needed
- Document why each user has their role

**Separation of duties**:
- Don't use admin account for routine tasks
- Different people for different stages
- No single person should control entire workflow

### Audit & Monitoring

**Regular reviews**:
- Check Events log daily for anomalies
- Review user activity weekly
- Audit all accounts monthly
- Investigate suspicious activity immediately

**What to watch for**:
- Failed login attempts (repeated)
- After-hours activity (if unusual)
- Mass data exports
- Permission changes
- Unusual approval patterns

### Data Protection

**Sensitive information**:
- Contractor financial data
- Personal contact information
- Business proprietary details
- Certificates and licenses

**Protect by**:
- Role-based access control
- Regular backups
- Secure data transmission
- Audit logging
- Compliance with data protection regulations

---

## 9. User Support

As admin, you're often first-line support.

### Common Support Requests

**"I forgot my password"**:
1. User Management → Find user → Edit
2. Set new temporary password
3. Provide securely (not via email)
4. Instruct to change immediately

**"I can't see pending applications"**:
1. Verify their role
2. Check if applications exist at their stage
3. Verify they're not out-of-office
4. Check if filters applied

**"Application disappeared"**:
1. Search for application ID
2. Check Events log for what happened
3. May have moved to different tab
4. Another user may have acted on it

**"Can't upload document"**:
1. Check file format and size
2. Verify browser compatibility
3. Check internet connection
4. Try different browser
5. Check if field configured correctly

### Escalation Path

1. Try to resolve yourself
2. Check documentation
3. Search Events log for clues
4. Consult with IT if technical issue
5. Contact vendor support if needed

---

## 10. Reporting & Analytics

### Standard Reports

**Approval metrics**:
- Applications pending by stage
- Average approval time
- Return rate (applications sent back)
- Approval rate by reviewer

**User activity**:
- Logins per user
- Actions taken per user
- Out-of-office patterns

**Contractor metrics**:
- Total registrations
- Approval rate
- Time to completion
- Expired certificates count

### Generating Reports

1. Use Export feature from relevant section
2. Apply filters for specific data
3. Export to Excel
4. Use Excel for further analysis
5. Create charts/graphs as needed

### Monthly Admin Report Template

```
Contractor Portal Monthly Report
Month: [Month Year]

Applications:
- New submissions: [count]
- Approved: [count]
- Returned: [count]
- Pending: [count]

Invitations:
- Sent: [count]
- Used: [count]
- Expired: [count]

Users:
- New staff accounts: [count]
- Deactivated: [count]
- Active users: [total]

System Activity:
- Total logins: [count]
- Total approvals: [count]
- Average approval time: [days]

Issues:
- Support tickets: [count]
- System errors: [count]
- Resolved: [count]

Notable Events:
[List any significant events or changes]
```

---

## Quick Reference

### Most Common Admin Tasks

| Task | Navigation | Steps |
|------|-----------|-------|
| **Create user** | User Management | Add Staff → Fill details → Assign role → Create |
| **Reset password** | User Management | Find user → Edit → Set new password → Save |
| **Create form** | Form Builder | Create New → Add pages/sections/fields → Publish |
| **Send invitation** | Registration Invites | Create New → Enter details → Send |
| **Approve application** | Registration Approvals | Find application → Review → Approve |
| **Revert application** | Registration Approvals | Open application → Revert to L2 → Select stage → Confirm |
| **Export data** | Any list view | Apply filters → Export to Excel |
| **View audit log** | Events | Filter/search as needed |

### Emergency Procedures

**User locked out**:
1. Reset password immediately
2. Verify account active
3. Provide new credentials securely

**Application stuck for days**:
1. Check Events log
2. Identify bottleneck
3. Reassign or approve yourself

**System performance issues**:
1. Check number of active sessions
2. Review recent activities in Events
3. Contact IT support
4. Consider scheduled maintenance

**Data loss concern**:
1. Check backup status
2. Attempt to locate in Events
3. Contact IT immediately
4. Document what was lost

---

## Advanced Topics

### Permissions System (if available)

Configure granular permissions:
- Module-level access
- Feature-level access
- Data-level access (own dept only, etc.)
- Stage-specific approval authority

### Workflow Customization

Some systems allow:
- Custom approval stages
- Conditional routing
- Automated notifications
- SLA/deadline enforcement

**Consult documentation or vendor for advanced configuration.**

### Integration Management

If integrated with other systems:
- **DocuWare**: Invoice form integration
- **Firebase**: Authentication backend
- **Email service**: Notification delivery
- **API**: External system connections

**Monitor integration health**: Check for failed API calls, sync issues, authentication errors.

---

## Resources

### Documentation

- [Complete User Manual](USER_MANUAL.md)
- [Staff Quick Start Guide](STAFF_QUICK_START.md)
- [Contractor Quick Start Guide](CONTRACTOR_QUICK_START.md)

### Support Contacts

- **IT Support**: [Add email/phone]
- **Vendor Support**: [Add vendor contact]
- **Emergency Contact**: [Add emergency contact]

### Training

- New admin onboarding: [duration]
- Form builder training: [schedule]
- User management best practices: [resources]

---

## Frequently Asked Questions

**Q: Can I delete submitted applications?**
A: No, to maintain audit trail. You can archive or mark as inactive.

**Q: Can I edit another user's actions?**
A: No, but you can add notes in Events and take corrective action going forward.

**Q: How many admin accounts should we have?**
A: Minimum 2 for redundancy. More based on team size. Not everyone needs admin access.

**Q: Can I recover a deleted form?**
A: No, deletions are permanent. Be very careful before deleting.

**Q: What if I accidentally deactivated the wrong user?**
A: Simply edit the user and reactivate. Their data and history remain intact.

**Q: Can contractors see the Events log?**
A: No, Events are staff/admin only for security and auditing.

**Q: How do I know if the system is backed up?**
A: Coordinate with IT department for backup schedules and verification.

---

**You're now equipped to administer the Amni Contractor Portal!**

For detailed information, refer to the complete [User Manual](USER_MANUAL.md).

**Document Version**: 1.0
**Last Updated**: December 2025

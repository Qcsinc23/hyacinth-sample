# Deployment Guide

## Hyacinth Medication Dispensing System

**Version:** 2.1.0  
**Last Updated:** March 2026  
**Target Audience:** System Administrators, IT Security Officers

---

## Overview

This guide provides step-by-step instructions for deploying Hyacinth in a production healthcare environment. It covers pre-deployment planning, installation, security configuration, and post-deployment validation.

---

## Pre-Deployment Checklist

### 1. Regulatory Review

- [ ] Privacy Officer has reviewed [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md)
- [ ] Security Officer has approved deployment plan
- [ ] Risk assessment completed for deployment environment
- [ ] Business Associate Agreements (BAAs) in place (if applicable)
- [ ] Incident response procedures documented

### 2. Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Workstations | Windows 10/11 Pro | Windows 11 Enterprise |
| CPU | Intel i3 / 2 cores | Intel i5 / 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 2 GB free (SSD preferred) | 10 GB free SSD |
| Network | Local network only | Isolated VLAN for PHI |
| Backup Storage | 2x database size | Network-attached encrypted storage |

### 3. Security Prerequisites

- [ ] Workstations configured with automatic screen lock (5 minutes)
- [ ] Windows Defender or approved antivirus configured
- [ ] USB device restrictions implemented (if required by policy)
- [ ] Physical workstation security (privacy screens, secure locations)
- [ ] User accounts created (Windows domain or local)

### 4. Staff Preparation

- [ ] HIPAA training completed for all users
- [ ] Hyacinth-specific training scheduled
- [ ] Staff PINs distributed securely (not via email)
- [ ] Emergency access procedures communicated

---

## Installation Steps

### Step 1: Pre-Installation

1. **Download the installer** from your internal repository or GitHub Releases
2. **Verify checksum** of the installer file:
   ```powershell
   # Windows PowerShell
   Get-FileHash "Hyacinth Setup 2.1.0.exe" -Algorithm SHA256
   ```
3. **Create installation directory** with appropriate permissions:
   ```
   C:\Program Files\Hyacinth\  (or user-selectable location)
   ```

### Step 2: Install Application

1. **Run installer as Administrator** (right-click > Run as administrator)
2. **Accept default installation path** or specify custom location
3. **Complete installation wizard**
4. **Verify desktop shortcut** was created

### Step 3: Initial Configuration

1. **Launch Hyacinth** for the first time
2. **Database will initialize automatically:**
   - Location: `%APPDATA%\Hyacinth\hyacinth.db`
   - Encryption: Enabled automatically
   - Schema: Migrations run automatically

3. **First Login:**
   - Default Admin PIN: `1234`
   - **Change immediately** after login: Settings > Profile > Change PIN

### Step 4: Security Hardening

1. **Set Master Password** (if not using default):
   ```powershell
   # Set environment variable
   [Environment]::SetEnvironmentVariable("HYACINTH_MASTER_PASSWORD", "YourSecurePassword123!", "Machine")
   ```

2. **Configure Backup Location:**
   - Navigate to: Settings > Backup
   - Set backup directory to encrypted network storage or local encrypted drive
   - Enable automatic backups (recommended: Daily at 2:00 AM)

3. **Verify Encryption:**
   - Check encryption status in Settings > Security
   - Verify "Encryption: ACTIVE" is displayed

### Step 5: User Account Setup

1. **Create Staff Accounts** (as Admin):
   - Settings > Staff Management
   - Add each staff member with appropriate role:
     - **Admin**: Full system access
     - **Dispenser**: Medication dispensing and patient lookup

2. **Distribute PINs Securely:**
   - Print or write PINs on paper
   - Hand directly to staff member
   - Do not send via email or messaging

3. **Verify Staff Can Log In:**
   - Have each staff member test their PIN
   - Confirm they can access appropriate functions

---

## Post-Deployment Validation

### 1. Functional Testing

| Test | Expected Result | Status |
|------|----------------|--------|
| Login with admin PIN | Successful login | ☐ |
| Create patient record | Patient saved successfully | ☐ |
| Dispense medication | Inventory deducted, label printed | ☐ |
| Search dispensing log | Results displayed | ☐ |
| Lock and unlock session | PIN required to unlock | ☐ |
| Automatic timeout | Screen locks after 5 min idle | ☐ |
| Backup completion | Backup file created | ☐ |

### 2. Security Validation

| Check | Method | Status |
|-------|--------|--------|
| Database encrypted | Check `hyacinth.db` is not human-readable | ☐ |
| Audit logs writing | Verify `%APPDATA%\Hyacinth\logs\main.log` | ☐ |
| Screen locks | Leave idle for 5 minutes | ☐ |
| Failed login tracking | Attempt wrong PIN 5 times | ☐ |
| Account lockout | Verify 30-minute lockout | ☐ |
| Backup encryption | Verify backup files are encrypted | ☐ |

### 3. Data Integrity Checks

```sql
-- Run in database console (if available)
-- Or verify through application:

-- Check migration version
SELECT version FROM db_metadata;  -- Should be 5

-- Verify medications loaded
SELECT COUNT(*) FROM medication_catalog;  -- Should be 46+

-- Verify instruction templates
SELECT COUNT(*) FROM medication_instruction_templates;  -- Should be 40+
```

---

## Backup and Disaster Recovery

### Automated Backups

**Configuration:**
- Location: Settings > Backup
- Frequency: Daily at 2:00 AM (configurable)
- Retention: 30 days (configurable)
- Encryption: Enabled (required)

**Backup Location Options:**

| Storage Type | Pros | Cons |
|--------------|------|------|
| Local encrypted drive | Fast restore | Single point of failure |
| Network NAS (encrypted) | Centralized, redundant | Network dependency |
| External USB (encrypted) | Air-gapped | Manual connection |

### Manual Backup

1. Navigate to: Settings > Backup
2. Click "Create Backup Now"
3. Verify backup completes successfully
4. Store backup file securely

### Restore Procedure

**Emergency Restore:**

1. **Stop Hyacinth** if running
2. **Open Hyacinth** and navigate to Settings > Restore
3. **Select backup file** from backup directory
4. **Preview restore** - verify table counts
5. **Type "RESTORE"** to confirm
6. **Wait for completion** - do not interrupt
7. **Verify data integrity** after restore

**Point-in-Time Recovery:**

Backups are timestamped. Select the appropriate backup based on:
- Last known good state before corruption
- Pre-incident backup for security events
- Scheduled maintenance windows

---

## Maintenance Procedures

### Daily

- [ ] Verify backup completed (check notification or backup directory)
- [ ] Review failed login attempts (Settings > Audit Log)
- [ ] Check for system alerts or warnings

### Weekly

- [ ] Review dispensing activity report
- [ ] Check inventory expiration alerts
- [ ] Verify audit log integrity
- [ ] Review staff access patterns

### Monthly

- [ ] Comprehensive audit log review
- [ ] Access permission review
- [ ] Security incident review
- [ ] Staff training compliance check
- [ ] Backup restoration test (restore to test environment)

### Annually

- [ ] Full HIPAA compliance audit
- [ ] Risk assessment update
- [ ] Policy review and update
- [ ] Security training refresh
- [ ] Penetration testing (if required)
- [ ] Disaster recovery drill

---

## Troubleshooting

### Common Issues

**Application Won't Start**

1. Check Windows Event Viewer for errors
2. Verify database file exists: `%APPDATA%\Hyacinth\hyacinth.db`
3. Check logs: `%APPDATA%\Hyacinth\logs\main.log`
4. Try running as Administrator
5. Reinstall if necessary (database will be preserved)

**Forgot Admin PIN**

1. **If you have another admin account:**
   - Log in as other admin
   - Reset PIN via Settings > Staff Management

2. **If no other admin exists:**
   - Requires database reset (data loss)
   - Contact Security Officer
   - Follow emergency procedures in Security Procedures doc

**Database Corruption**

1. Stop Hyacinth
2. Restore from most recent backup
3. If no backup, contact technical support
4. Document incident per security procedures

**Backup Failures**

1. Check backup directory permissions
2. Verify disk space available
3. Check logs for specific error
4. Try manual backup to test

### Log Locations

| Log Type | Location |
|----------|----------|
| Application logs | `%APPDATA%\Hyacinth\logs\main.log` |
| Database | `%APPDATA%\Hyacinth\hyacinth.db` |
| Backups | Configurable (default: `%APPDATA%\Hyacinth\backups\`) |
| Crash dumps | `%APPDATA%\Hyacinth\Crashpad\` |

---

## Security Incident Response

**Immediate Actions:**

1. **Containment:**
   - Lock affected workstation
   - Do not power off (preserve evidence)
   - Isolate from network if breach suspected

2. **Notification:**
   - Notify Security Officer immediately
   - Do not attempt to cover up or hide
   - Document what you observed

3. **Documentation:**
   - Time of discovery
   - Systems involved
   - Description of incident
   - Actions taken
   - Witnesses present

**Follow full procedures in:** [SECURITY_PROCEDURES.md](SECURITY_PROCEDURES.md) Section 4

---

## Compliance Notes

### HIPAA Requirements Met

- ✓ Administrative Safeguards (Risk analysis, training, policies)
- ✓ Physical Safeguards (Workstation security, access controls)
- ✓ Technical Safeguards (Encryption, audit controls, access management)
- ✓ Privacy Rule (Patient rights, data retention, breach procedures)
- ✓ Security Rule (Risk management, sanctions, activity review)

### Audit Readiness

Maintain the following for compliance audits:

1. **Documentation:**
   - This deployment guide
   - Security policies
   - Training records
   - Incident reports

2. **Logs:**
   - Application audit logs (6-year retention)
   - Access logs
   - Backup logs
   - Security incident logs

3. **Procedures:**
   - Backup/restore tested quarterly
   - Disaster recovery plan tested annually
   - Security incident response tested

---

## Support Contacts

**Internal Support:**
- IT Help Desk: [Your internal contact]
- Security Officer: [Your security contact]
- Privacy Officer: [Your privacy contact]

**External Resources:**
- GitHub Issues: https://github.com/Qcsinc23/hyacinth-sample/issues
- Documentation: See `docs/` directory
- Changelog: [CHANGELOG.md](../CHANGELOG.md)

---

## Appendix

### Environment Variables Reference

| Variable | Purpose | Set Location |
|----------|---------|--------------|
| `HYACINTH_MASTER_PASSWORD` | Database encryption key | System Environment |
| `HYACINTH_BOOTSTRAP_ADMIN_PIN` | Initial admin PIN | System Environment |
| `HYACINTH_E2E_TEST` | Test mode (skip single-instance) | Not for production |

### File Paths Summary

| Purpose | Windows Path |
|---------|---------------|
| Application | `C:\Program Files\Hyacinth\` or user-selected |
| Database | `%APPDATA%\Hyacinth\hyacinth.db` |
| Logs | `%APPDATA%\Hyacinth\logs\` |
| Backups | `%APPDATA%\Hyacinth\backups\` |
| Settings | Stored in database |

### Migration Versions

| Version | Description | Date |
|---------|-------------|------|
| 1 | Initial schema | Baseline |
| 2 | Medication catalog + instruction templates | Feb 2025 |
| 3 | Additional STI medications (Gentamicin, etc.) | Feb 2025 |
| 4 | Plain language dosing update | Feb 2025 |
| 5 | Full CDC 2022 STI medication suite | Mar 2026 |

---

**Document Classification:** Internal Use Only  
**Review Cycle:** Quarterly  
**Next Review Date:** June 2026

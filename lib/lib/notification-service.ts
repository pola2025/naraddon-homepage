// 알림 서비스 - 이메일, SMS, 인앱 알림 통합 관리

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push'
}

export enum NotificationEvent {
  // 상담 관련
  CONSULTATION_SUBMITTED = 'consultation_submitted',
  CONSULTATION_ASSIGNED = 'consultation_assigned',
  CONSULTATION_STATUS_CHANGED = 'consultation_status_changed',
  CONSULTATION_PHASE_UPDATED = 'consultation_phase_updated',
  CONSULTATION_CONTRACT_SIGNED = 'consultation_contract_signed',
  CONSULTATION_COMPLETED = 'consultation_completed',
  CONSULTATION_CANCELLED = 'consultation_cancelled',

  // 사용자 관련
  USER_REGISTERED = 'user_registered',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_PROFILE_INCOMPLETE = 'user_profile_incomplete',

  // 관리자 관련
  ADMIN_NEW_IP = 'admin_new_ip',
  ADMIN_SECURITY_ALERT = 'admin_security_alert',

  // 일정 관련
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_SCHEDULED = 'appointment_scheduled',
  APPOINTMENT_CANCELLED = 'appointment_cancelled'
}

export interface NotificationTemplate {
  id: string;
  event: NotificationEvent;
  type: NotificationType;
  subject?: string;
  template: string;
  variables: string[];
}

export interface NotificationRecipient {
  email?: string;
  phone?: string;
  userId?: string;
  name?: string;
}

export interface NotificationData {
  event: NotificationEvent;
  recipients: NotificationRecipient[];
  variables: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
}

class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // 상담 신청 알림 템플릿
    this.templates.set('consultation_submitted_email', {
      id: 'consultation_submitted_email',
      event: NotificationEvent.CONSULTATION_SUBMITTED,
      type: NotificationType.EMAIL,
      subject: '[나라똔] 상담 신청이 접수되었습니다',
      template: `
        안녕하세요, {{userName}}님.

        상담 신청이 정상적으로 접수되었습니다.

        [신청 정보]
        - 상담 유형: {{consultationType}}
        - 신청일시: {{submittedAt}}
        - 희망일시: {{preferredDate}}

        담당자 배정 후 연락드리겠습니다.

        감사합니다.
        나라똔 드림
      `,
      variables: ['userName', 'consultationType', 'submittedAt', 'preferredDate']
    });

    // 상담 배정 알림 (담당자용)
    this.templates.set('consultation_assigned_staff_email', {
      id: 'consultation_assigned_staff_email',
      event: NotificationEvent.CONSULTATION_ASSIGNED,
      type: NotificationType.EMAIL,
      subject: '[나라똔] 새로운 상담이 배정되었습니다',
      template: `
        {{staffName}}님께 새로운 상담이 배정되었습니다.

        [고객 정보]
        - 고객명: {{customerName}}
        - 연락처: {{customerPhone}}
        - 회사: {{companyName}}

        [상담 정보]
        - 상담 유형: {{consultationType}}
        - 희망일시: {{preferredDate}}
        - 상담 내용: {{message}}

        상담 관리 페이지에서 자세한 내용을 확인하세요.
        {{consultationLink}}
      `,
      variables: ['staffName', 'customerName', 'customerPhone', 'companyName', 'consultationType', 'preferredDate', 'message', 'consultationLink']
    });

    // 계약 체결 알림
    this.templates.set('contract_signed_email', {
      id: 'contract_signed_email',
      event: NotificationEvent.CONSULTATION_CONTRACT_SIGNED,
      type: NotificationType.EMAIL,
      subject: '[나라똔] 계약이 체결되었습니다',
      template: `
        {{userName}}님, 계약 체결을 축하드립니다!

        [계약 정보]
        - 계약 유형: {{contractType}}
        - 계약 금액: {{contractAmount}}원
        - 계약일: {{contractDate}}

        앞으로도 최선을 다해 서비스하겠습니다.

        감사합니다.
      `,
      variables: ['userName', 'contractType', 'contractAmount', 'contractDate']
    });

    // SMS 템플릿
    this.templates.set('consultation_reminder_sms', {
      id: 'consultation_reminder_sms',
      event: NotificationEvent.APPOINTMENT_REMINDER,
      type: NotificationType.SMS,
      template: `[나라똔] {{userName}}님, {{appointmentDate}} 상담 예정입니다. 장소: {{location}}`,
      variables: ['userName', 'appointmentDate', 'location']
    });
  }

  // 알림 발송
  async send(data: NotificationData): Promise<boolean> {
    try {
      const results = await Promise.allSettled([
        this.sendEmail(data),
        this.sendSMS(data),
        this.sendInApp(data)
      ]);

      const success = results.some(r => r.status === 'fulfilled' && r.value);
      return success;
    } catch (error) {
      console.error('Notification send error:', error);
      return false;
    }
  }

  // 이메일 발송
  private async sendEmail(data: NotificationData): Promise<boolean> {
    const template = this.getTemplate(data.event, NotificationType.EMAIL);
    if (!template) return false;

    const emailRecipients = data.recipients.filter(r => r.email);
    if (emailRecipients.length === 0) return false;

    try {
      // 실제 이메일 발송 API 호출
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecipients.map(r => r.email),
          subject: this.interpolate(template.subject || '', data.variables),
          body: this.interpolate(template.template, data.variables),
          priority: data.priority
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  // SMS 발송
  private async sendSMS(data: NotificationData): Promise<boolean> {
    const template = this.getTemplate(data.event, NotificationType.SMS);
    if (!template) return false;

    const smsRecipients = data.recipients.filter(r => r.phone);
    if (smsRecipients.length === 0) return false;

    try {
      // 실제 SMS 발송 API 호출
      const response = await fetch('/api/notifications/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: smsRecipients.map(r => r.phone),
          message: this.interpolate(template.template, data.variables),
          priority: data.priority
        })
      });

      return response.ok;
    } catch (error) {
      console.error('SMS send error:', error);
      return false;
    }
  }

  // 인앱 알림 생성
  private async sendInApp(data: NotificationData): Promise<boolean> {
    const userRecipients = data.recipients.filter(r => r.userId);
    if (userRecipients.length === 0) return false;

    try {
      const response = await fetch('/api/notifications/in-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: userRecipients.map(r => r.userId),
          event: data.event,
          data: data.variables,
          priority: data.priority
        })
      });

      return response.ok;
    } catch (error) {
      console.error('In-app notification error:', error);
      return false;
    }
  }

  // 템플릿 조회
  private getTemplate(event: NotificationEvent, type: NotificationType): NotificationTemplate | null {
    const key = `${event}_${type}`;
    return this.templates.get(key) || null;
  }

  // 변수 치환
  private interpolate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  // 상담 관련 알림 헬퍼 메서드들
  async notifyConsultationSubmitted(consultation: any) {
    return this.send({
      event: NotificationEvent.CONSULTATION_SUBMITTED,
      recipients: [
        {
          email: consultation.userEmail,
          phone: consultation.userPhone,
          name: consultation.userName
        }
      ],
      variables: {
        userName: consultation.userName,
        consultationType: consultation.consultationType,
        submittedAt: new Date().toLocaleString('ko-KR'),
        preferredDate: consultation.preferredDate ?
          new Date(consultation.preferredDate).toLocaleString('ko-KR') : '미정'
      }
    });
  }

  async notifyConsultationAssigned(consultation: any, staff: any) {
    return this.send({
      event: NotificationEvent.CONSULTATION_ASSIGNED,
      recipients: [
        {
          email: staff.email,
          userId: staff.id,
          name: staff.name
        }
      ],
      variables: {
        staffName: staff.name,
        customerName: consultation.userName,
        customerPhone: consultation.userPhone,
        companyName: consultation.companyName || '-',
        consultationType: consultation.consultationType,
        preferredDate: consultation.preferredDate ?
          new Date(consultation.preferredDate).toLocaleString('ko-KR') : '미정',
        message: consultation.message,
        consultationLink: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/consultations/${consultation._id}`
      }
    });
  }

  async notifyContractSigned(consultation: any, contractInfo: any) {
    return this.send({
      event: NotificationEvent.CONSULTATION_CONTRACT_SIGNED,
      recipients: [
        {
          email: consultation.userEmail,
          phone: consultation.userPhone,
          name: consultation.userName
        }
      ],
      variables: {
        userName: consultation.userName,
        contractType: contractInfo.type,
        contractAmount: contractInfo.amount.toLocaleString('ko-KR'),
        contractDate: new Date().toLocaleDateString('ko-KR')
      },
      priority: 'high'
    });
  }

  // 일정 리마인더
  async sendAppointmentReminder(appointment: any) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.send({
      event: NotificationEvent.APPOINTMENT_REMINDER,
      recipients: [
        {
          email: appointment.userEmail,
          phone: appointment.userPhone,
          name: appointment.userName
        }
      ],
      variables: {
        userName: appointment.userName,
        appointmentDate: new Date(appointment.scheduledDate).toLocaleString('ko-KR'),
        location: appointment.location || '추후 안내'
      },
      scheduledAt: tomorrow
    });
  }
}

// 싱글톤 인스턴스
export const notificationService = new NotificationService();
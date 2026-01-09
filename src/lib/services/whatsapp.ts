import twilio from 'twilio'

interface WhatsAppMessage {
  to: string
  body: string
  mediaUrl?: string
}

interface MessageTemplate {
  id: string
  name: string
  template: string
  variables: string[]
}

export class WhatsAppService {
  private client: any
  private fromNumber: string

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
  }

  async sendMessage({ to, body, mediaUrl }: WhatsAppMessage) {
    try {
      const message = await this.client.messages.create({
        body,
        from: this.fromNumber,
        to: `whatsapp:${to}`,
        ...(mediaUrl && { mediaUrl: [mediaUrl] })
      })

      return {
        success: true,
        messageId: message.sid,
        status: message.status
      }
    } catch (error: any) {
      console.error('WhatsApp send error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Predefined templates for different scenarios
  getMessageTemplates(): MessageTemplate[] {
    return [
      {
        id: 'welcome',
        name: 'Welcome Message',
        template: 'Hoi {name}! 💪 Welkom bij Feeling Fit Utrecht! Ik ben je digitale coach. Heb je vragen over trainingsschemas of wil je een intake plannen? Ik help je graag!',
        variables: ['name']
      },
      {
        id: 'churn_prevention_14_days',
        name: '2 Week Absence',
        template: 'Hey {name}! We missen je bij Feeling Fit 😊 Alles goed? Je laatste training was {days} dagen geleden. Zal ik een plekje voor je reserveren bij {suggested_class} morgen?',
        variables: ['name', 'days', 'suggested_class']
      },
      {
        id: 'churn_prevention_30_days',
        name: '1 Month Absence',
        template: 'Hoi {name}, het is alweer een maand geleden dat we je zagen! 🤔 Kunnen we je ergens mee helpen? Misschien een ander trainingsschema of andere tijden? Laat het weten!',
        variables: ['name']
      },
      {
        id: 'churn_prevention_90_days',
        name: '3 Month Absence',
        template: 'Hey {name}, we missen je echt bij Feeling Fit! Het is al 3 maanden geleden. Wil je je lidmaatschap pauzeren of kunnen we je motiveren om weer te starten? Ik bel je graag even om te bespreken wat voor jou werkt.',
        variables: ['name']
      },
      {
        id: 'lead_followup_48h',
        name: 'Lead Follow-up',
        template: 'Hoi {name}! Leuk dat je interesse hebt in Feeling Fit! 🎯 Ik zag dat je je hebt aangemeld via {source}. Wanneer past het jou voor een gratis intake? We hebben morgen om {time1} of {time2} nog plek.',
        variables: ['name', 'source', 'time1', 'time2']
      },
      {
        id: 'training_reminder',
        name: 'Training Reminder',
        template: 'Reminder: {class_name} begint over 1 uur! 🏃‍♂️ Tot straks bij Feeling Fit!',
        variables: ['class_name']
      },
      {
        id: 'achievement',
        name: 'Achievement Message',
        template: 'Wow {name}! 🎉 Je hebt deze maand al {visits} keer getraind! Keep up the great work! 💪',
        variables: ['name', 'visits']
      },
      {
        id: 'birthday',
        name: 'Birthday Greeting',
        template: 'Happy Birthday {name}! 🎂 Vier je verjaardag met een gratis PT sessie! Claim hem deze week bij de balie.',
        variables: ['name']
      }
    ]
  }

  fillTemplate(template: string, variables: Record<string, string>): string {
    let filled = template
    Object.entries(variables).forEach(([key, value]) => {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return filled
  }

  async sendTemplateMessage(
    to: string,
    templateId: string,
    variables: Record<string, string>
  ) {
    const templates = this.getMessageTemplates()
    const template = templates.find(t => t.id === templateId)
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const body = this.fillTemplate(template.template, variables)
    return this.sendMessage({ to, body })
  }

  // Bulk messaging with rate limiting
  async sendBulkMessages(
    messages: WhatsAppMessage[],
    delayMs: number = 1000
  ) {
    const results = []
    
    for (const message of messages) {
      const result = await this.sendMessage(message)
      results.push(result)
      
      // Rate limiting to avoid Twilio restrictions
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    
    return results
  }

  // Interactive bot responses
  async handleIncomingMessage(from: string, body: string) {
    const lowerBody = body.toLowerCase()
    
    // Simple keyword-based responses
    if (lowerBody.includes('schema') || lowerBody.includes('training')) {
      return {
        response: `Super dat je wilt trainen! 💪 Ik heb 3 populaire schema's voor je:

1️⃣ *Beginner* - 3x per week full body
2️⃣ *Gevorderd* - 4x per week upper/lower split  
3️⃣ *Expert* - 5x per week push/pull/legs

Stuur 1, 2 of 3 voor meer info!`
      }
    }
    
    if (lowerBody.includes('les') || lowerBody.includes('groep')) {
      return {
        response: `Onze groepslessen deze week:

📅 *Maandag*
09:00 - Yoga
18:00 - Spinning
19:00 - BodyPump

📅 *Woensdag*  
18:00 - CrossFit
19:00 - Pilates

📅 *Vrijdag*
17:00 - Boxing
18:00 - HIIT

Stuur de naam van de les om je aan te melden!`
      }
    }
    
    if (lowerBody.includes('intake') || lowerBody.includes('afspraak')) {
      return {
        response: `Perfect! Ik plan graag een intake voor je. 📋

We hebben deze week nog plek op:
- Dinsdag 14:00
- Donderdag 10:00  
- Zaterdag 11:00

Welke tijd past jou het beste?`
      }
    }
    
    if (lowerBody === '1' || lowerBody === '2' || lowerBody === '3') {
      const schemas = {
        '1': `*Beginner Schema (3x per week)*
        
Maandag: Full Body A
- Squat 3x10
- Bench Press 3x10
- Row 3x10
- Shoulder Press 3x10
        
Woensdag: Full Body B
- Deadlift 3x8
- Incline Press 3x10  
- Pull-ups 3xmax
- Lunges 3x10
        
Vrijdag: Full Body C
- Front Squat 3x10
- Dips 3x8
- Cable Row 3x12
- Plank 3x1min`,
        
        '2': `*Gevorderd Schema (4x per week)*
        
Maandag: Upper Power
Dinsdag: Lower Power
Donderdag: Upper Hypertrophy
Vrijdag: Lower Hypertrophy
        
Wil je het complete schema? Stuur 'JA'`,
        
        '3': `*Expert Schema (5x per week)*
        
Push/Pull/Legs/Upper/Lower
        
High volume, high intensity
Perfect voor muscle building!
        
Wil je het complete schema? Stuur 'JA'`
      }
      
      return { response: schemas[lowerBody] || 'Kies 1, 2 of 3 voor een schema.' }
    }
    
    // Default response
    return {
      response: `Hey! Ik kan je helpen met:
      
💪 Trainingsschema's - stuur 'schema'
📅 Groepslessen - stuur 'les'  
📋 Intake plannen - stuur 'intake'
❓ Andere vragen - bel ons op 030-1234567

Waar kan ik je mee helpen?`
    }
  }
}
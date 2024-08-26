
class EmailService {
    constructor(providers, retrySettings) {
      this.providers = providers;
      this.retrySettings = retrySettings;
      this.statusTracker = {};
    }
  
    async sendEmail(email, message) {
      const emailId = generateEmailId(email, message);
      if (this.statusTracker[emailId]) {
       
        return this.statusTracker[emailId];
      }
  
      let attempts = 0;
      let provider = this.providers.primary;
  
      while (attempts < this.retrySettings.maxAttempts) {
        try {
          
          if (!isSendingAllowed()) {
            throw new Error('Rate limit exceeded');
          }
  
          
          const result = await provider.sendEmail(email, message);
          this.statusTracker[emailId] = result;
          return result;
        } catch (error) {
          attempts++;
          
          const delay = calculateDelay(attempts, this.retrySettings);
          await new Promise(resolve => setTimeout(resolve, delay));
  
          
          if (attempts % 2 === 0) {
            provider = this.providers.secondary;
          } else {
            provider = this.providers.primary;
          }
        }
      }
  
      
      this.statusTracker[emailId] = { error: 'All attempts failed' };
      return this.statusTracker[emailId];
    }
  }
  
  
  class MockEmailProvider {
    async sendEmail(email, message) {
     
      if (Math.random() < 0.5) {
        throw new Error('Email sending failed');
      }
      return { success: true };
    }
  }
  
  
  function calculateDelay(attempts, retrySettings) {
    const initialDelay = retrySettings.initialDelay;
    const backoffFactor = retrySettings.backoffFactor;
    return Math.min(initialDelay * Math.pow(backoffFactor, attempts), 30000); // 30 seconds max
  }
  
  function generateEmailId(email, message) {
    return `${email}_${message}`;
  }
  
  function isSendingAllowed() {
    
    const rateLimit = 5;
    const timeWindow = 60 * 1000;
    const now = Date.now();
    const sendingHistory = []; 
  
    
    if (sendingHistory.length >= rateLimit) {
      const oldestSend = sendingHistory[0];
      if (now - oldestSend < timeWindow) {
        return false; 
      }
    }
  
  
    sendingHistory.push(now);
    return true;
  }
  
    class CircuitBreaker {
    constructor(settings) {
      this.settings = settings;
      this.state = 'closed';
      this.failureCount = 0;
      this.openedAt = null;
    }
  
    async execute(func) {
      if (this.state === 'open') {
          throw new Error('Circuit is open');
      }
  
      try {
        const result = await func();
        this.failureCount = 0;
        return result;
      } catch (error) {
        this.failureCount++;
        if (this.failureCount >= this.settings.threshold) {
  
          this.state = 'open';
          this.openedAt = Date.now();
        }
        throw error;
      }
    }
  
    async reset() {
      if (this.state === 'open' && Date.now() - this.openedAt > this.settings.timeout) {
  
        this.state = 'closed';
        this.failureCount = 0;
      }
    }
  }
  
  
  const primaryProvider = new MockEmailProvider();
  const secondaryProvider = new MockEmailProvider();
  const retrySettings = {
    maxAttempts: 3,
    initialDelay: 500,
    backoffFactor: 2,
  };
  const emailService = new EmailService({ primary: primaryProvider, secondary: secondaryProvider }, retrySettings);
  
  const circuitBreaker = new CircuitBreaker({
    threshold: 3,
    timeout: 30000,
  });
  
  async function sendEmail(email, message) {
    try {
      const result = await circuitBreaker.execute(() => emailService.sendEmail(email, message));
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
  
  sendEmail('example@example.com', 'Hello, world!');

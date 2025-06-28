import { describe, it, expect, beforeEach } from "vitest"

describe("Communication Coordination Contract", () => {
  let contractState
  
  beforeEach(() => {
    contractState = {
      communicationMessages: new Map(),
      channelConfigurations: new Map(),
      stakeholderCommunications: new Map(),
      messageCounter: 0,
    }
  })
  
  describe("setup-channel-config", () => {
    it("should successfully setup channel configuration", () => {
      const brandId = "brand-123"
      const channel = "twitter"
      const autoPost = true
      const approvalRequired = false
      const responseTemplate = "Standard Twitter response template"
      const contactInfo = "@brandhandle"
      
      const result = setupChannelConfig(
          contractState,
          brandId,
          channel,
          autoPost,
          approvalRequired,
          responseTemplate,
          contactInfo,
      )
      
      expect(result.success).toBe(true)
      
      const configKey = `${brandId}-${channel}`
      expect(contractState.channelConfigurations.has(configKey)).toBe(true)
      
      const config = contractState.channelConfigurations.get(configKey)
      expect(config.active).toBe(true)
      expect(config.autoPost).toBe(autoPost)
      expect(config.approvalRequired).toBe(approvalRequired)
      expect(config.responseTemplate).toBe(responseTemplate)
    })
  })
  
  describe("create-communication-message", () => {
    it("should successfully create a communication message", () => {
      const brandId = "brand-123"
      const crisisId = "crisis-456"
      const messageType = "public-statement"
      const content = "We are aware of the situation and investigating"
      const targetChannels = ["twitter", "facebook"]
      const priority = 4
      const scheduledTime = Date.now() + 3600000 // 1 hour from now
      
      const result = createCommunicationMessage(
          contractState,
          brandId,
          crisisId,
          messageType,
          content,
          targetChannels,
          priority,
          scheduledTime,
      )
      
      expect(result.success).toBe(true)
      expect(result.messageId).toBeDefined()
      expect(contractState.messageCounter).toBe(1)
      
      const message = contractState.communicationMessages.get(result.messageId)
      expect(message.brandId).toBe(brandId)
      expect(message.content).toBe(content)
      expect(message.status).toBe("draft")
      expect(message.priority).toBe(priority)
    })
  })
  
  describe("approve-message", () => {
    it("should successfully approve a message", () => {
      // Create message first
      const createResult = createCommunicationMessage(
          contractState,
          "brand-123",
          "crisis-456",
          "statement",
          "test content",
          ["twitter"],
          3,
          Date.now(),
      )
      const messageId = createResult.messageId
      
      const result = approveMessage(contractState, messageId, "approver-principal")
      
      expect(result.success).toBe(true)
      
      const message = contractState.communicationMessages.get(messageId)
      expect(message.status).toBe("approved")
      expect(message.approvedBy).toBe("approver-principal")
    })
    
    it("should fail for non-existent message", () => {
      const result = approveMessage(contractState, "non-existent", "approver")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_MESSAGE_NOT_FOUND")
    })
  })
  
  describe("send-message", () => {
    it("should successfully send approved message", () => {
      // Create and approve message
      const createResult = createCommunicationMessage(
          contractState,
          "brand-123",
          "crisis-456",
          "statement",
          "test content",
          ["twitter"],
          3,
          Date.now(),
      )
      const messageId = createResult.messageId
      
      approveMessage(contractState, messageId, "approver")
      
      const result = sendMessage(contractState, messageId)
      
      expect(result.success).toBe(true)
      
      const message = contractState.communicationMessages.get(messageId)
      expect(message.status).toBe("sent")
      expect(message.sentTime).toBeGreaterThan(0)
    })
    
    it("should fail to send non-approved message", () => {
      const createResult = createCommunicationMessage(
          contractState,
          "brand-123",
          "crisis-456",
          "statement",
          "test content",
          ["twitter"],
          3,
          Date.now(),
      )
      const messageId = createResult.messageId
      
      const result = sendMessage(contractState, messageId)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("register-stakeholder", () => {
    it("should successfully register a stakeholder", () => {
      const stakeholderId = "stakeholder-123"
      const stakeholderType = "investor"
      const contactMethod = "email"
      const priorityLevel = 5
      
      const result = registerStakeholder(contractState, stakeholderId, stakeholderType, contactMethod, priorityLevel)
      
      expect(result.success).toBe(true)
      expect(contractState.stakeholderCommunications.has(stakeholderId)).toBe(true)
      
      const stakeholder = contractState.stakeholderCommunications.get(stakeholderId)
      expect(stakeholder.stakeholderType).toBe(stakeholderType)
      expect(stakeholder.priorityLevel).toBe(priorityLevel)
      expect(stakeholder.communicationHistory).toEqual([])
    })
  })
})

// Mock contract functions
function setupChannelConfig(state, brandId, channel, autoPost, approvalRequired, responseTemplate, contactInfo) {
  const configKey = `${brandId}-${channel}`
  
  state.channelConfigurations.set(configKey, {
    active: true,
    autoPost,
    approvalRequired,
    responseTemplate,
    contactInfo,
  })
  
  return { success: true }
}

function createCommunicationMessage(
    state,
    brandId,
    crisisId,
    messageType,
    content,
    targetChannels,
    priority,
    scheduledTime,
) {
  const messageId = state.messageCounter.toString()
  
  state.communicationMessages.set(messageId, {
    brandId,
    crisisId,
    messageType,
    content,
    targetChannels,
    priority,
    scheduledTime,
    sentTime: 0,
    status: "draft",
    createdBy: "test-principal",
    approvedBy: null,
  })
  
  state.messageCounter++
  
  return { success: true, messageId }
}

function approveMessage(state, messageId, approver) {
  const message = state.communicationMessages.get(messageId)
  
  if (!message) {
    return { success: false, error: "ERR_MESSAGE_NOT_FOUND" }
  }
  
  message.status = "approved"
  message.approvedBy = approver
  state.communicationMessages.set(messageId, message)
  
  return { success: true }
}

function sendMessage(state, messageId) {
  const message = state.communicationMessages.get(messageId)
  
  if (!message) {
    return { success: false, error: "ERR_MESSAGE_NOT_FOUND" }
  }
  
  if (message.status !== "approved") {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  message.status = "sent"
  message.sentTime = Date.now()
  state.communicationMessages.set(messageId, message)
  
  return { success: true }
}

function registerStakeholder(state, stakeholderId, stakeholderType, contactMethod, priorityLevel) {
  state.stakeholderCommunications.set(stakeholderId, {
    stakeholderType,
    contactMethod,
    priorityLevel,
    lastContacted: 0,
    communicationHistory: [],
  })
  
  return { success: true }
}

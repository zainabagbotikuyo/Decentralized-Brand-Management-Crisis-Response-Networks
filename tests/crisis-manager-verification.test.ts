import { describe, it, expect, beforeEach } from "vitest"

describe("Crisis Manager Verification Contract", () => {
  let contractState
  
  beforeEach(() => {
    // Mock contract state
    contractState = {
      crisisManagers: new Map(),
      brandManagerAssignments: new Map(),
      totalVerifiedManagers: 0,
      contractOwner: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
    }
  })
  
  describe("register-crisis-manager", () => {
    it("should successfully register a new crisis manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const specialization = "Social Media Crisis Management"
      const experienceYears = 5
      const certifications = ["PRSA Certification", "Crisis Management Certificate"]
      
      // Simulate contract call
      const result = registerCrisisManager(contractState, manager, specialization, experienceYears, certifications)
      
      expect(result.success).toBe(true)
      expect(contractState.crisisManagers.has(manager)).toBe(true)
      
      const managerData = contractState.crisisManagers.get(manager)
      expect(managerData.specialization).toBe(specialization)
      expect(managerData.experienceYears).toBe(experienceYears)
      expect(managerData.verified).toBe(false)
      expect(managerData.reputationScore).toBe(0)
    })
    
    it("should fail when manager is already registered", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      // Register manager first time
      registerCrisisManager(contractState, manager, "Test", 1, [])
      
      // Try to register again
      const result = registerCrisisManager(contractState, manager, "Test2", 2, [])
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_ALREADY_VERIFIED")
    })
  })
  
  describe("verify-manager", () => {
    it("should successfully verify a registered manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const owner = contractState.contractOwner
      
      // Register manager first
      registerCrisisManager(contractState, manager, "Test", 1, [])
      
      // Verify manager
      const result = verifyManager(contractState, owner, manager)
      
      expect(result.success).toBe(true)
      expect(contractState.crisisManagers.get(manager).verified).toBe(true)
      expect(contractState.totalVerifiedManagers).toBe(1)
    })
    
    it("should fail when called by non-owner", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const nonOwner = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
      
      registerCrisisManager(contractState, manager, "Test", 1, [])
      
      const result = verifyManager(contractState, nonOwner, manager)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("assign-manager-to-brand", () => {
    it("should successfully assign verified manager to brand", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const brandId = "brand-123"
      const contractTerms = "Standard crisis management contract"
      
      // Register and verify manager
      registerCrisisManager(contractState, manager, "Test", 1, [])
      verifyManager(contractState, contractState.contractOwner, manager)
      
      // Assign to brand
      const result = assignManagerToBrand(contractState, brandId, manager, contractTerms)
      
      expect(result.success).toBe(true)
      
      const assignmentKey = `${brandId}-${manager}`
      expect(contractState.brandManagerAssignments.has(assignmentKey)).toBe(true)
      
      const assignment = contractState.brandManagerAssignments.get(assignmentKey)
      expect(assignment.status).toBe("active")
      expect(assignment.contractTerms).toBe(contractTerms)
    })
    
    it("should fail when manager is not verified", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const brandId = "brand-123"
      
      // Register but don't verify manager
      registerCrisisManager(contractState, manager, "Test", 1, [])
      
      const result = assignManagerToBrand(contractState, brandId, manager, "terms")
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR_UNAUTHORIZED")
    })
  })
  
  describe("get-manager-info", () => {
    it("should return manager information", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const specialization = "Digital Crisis Management"
      
      registerCrisisManager(contractState, manager, specialization, 3, ["Cert1"])
      
      const result = getManagerInfo(contractState, manager)
      
      expect(result).toBeDefined()
      expect(result.specialization).toBe(specialization)
      expect(result.experienceYears).toBe(3)
      expect(result.verified).toBe(false)
    })
    
    it("should return null for non-existent manager", () => {
      const manager = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      const result = getManagerInfo(contractState, manager)
      
      expect(result).toBeNull()
    })
  })
})

// Mock contract functions
function registerCrisisManager(state, manager, specialization, experienceYears, certifications) {
  if (state.crisisManagers.has(manager)) {
    return { success: false, error: "ERR_ALREADY_VERIFIED" }
  }
  
  state.crisisManagers.set(manager, {
    verified: false,
    specialization,
    experienceYears,
    certifications,
    reputationScore: 0,
    activeCases: 0,
    verificationDate: 0,
  })
  
  return { success: true }
}

function verifyManager(state, caller, manager) {
  if (caller !== state.contractOwner) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  if (!state.crisisManagers.has(manager)) {
    return { success: false, error: "ERR_NOT_FOUND" }
  }
  
  const managerData = state.crisisManagers.get(manager)
  managerData.verified = true
  managerData.verificationDate = Date.now()
  
  state.totalVerifiedManagers++
  
  return { success: true }
}

function assignManagerToBrand(state, brandId, manager, contractTerms) {
  const managerData = state.crisisManagers.get(manager)
  
  if (!managerData || !managerData.verified) {
    return { success: false, error: "ERR_UNAUTHORIZED" }
  }
  
  const assignmentKey = `${brandId}-${manager}`
  state.brandManagerAssignments.set(assignmentKey, {
    assignedDate: Date.now(),
    status: "active",
    contractTerms,
  })
  
  return { success: true }
}

function getManagerInfo(state, manager) {
  return state.crisisManagers.get(manager) || null
}

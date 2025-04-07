/**
 * Test suite for customer name handling
 * 
 * These tests verify that customer creation, updates, and conversions
 * handle the name field correctly and maintain consistency between
 * name and firstName/lastName fields.
 */

import { db } from "../db";
import { customers, leads } from "../db/schema";
import { customersService } from "../server/services/customers.service";
import { generateFullName } from "../server/utils/name-utils";

// Mock Express Request and Response objects
const mockRequest = (params = {}, body = {}) => ({
  params,
  body
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock db module
jest.mock("../db", () => ({
  db: {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1, name: 'Test Customer' }]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    query: {
      customers: {
        findFirst: jest.fn()
      }
    },
    transaction: jest.fn().mockImplementation(callback => callback({
      execute: jest.fn().mockResolvedValue([])
    }))
  }
}));

// Mock event emitter
jest.mock("../server/lib/event-emitter", () => ({
  appEvents: {
    emit: jest.fn()
  },
  EventTypes: {
    CUSTOMER_CREATED: "customer_created",
    CUSTOMER_UPDATED: "customer_updated",
    CUSTOMER_DELETED: "customer_deleted",
    LEAD_CREATED: "lead_created"
  }
}));

describe('Customer Service Name Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('should use the name utility to generate the name field', async () => {
      // Setup
      const req = mockRequest({}, {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com'
      });
      const res = mockResponse();

      // Execute
      await customersService.createCustomer(req, res);

      // Verify
      expect(db.insert).toHaveBeenCalledWith(customers);
      expect(db.values).toHaveBeenCalledWith(expect.objectContaining({
        name: generateFullName('Juan', 'Pérez'),
        firstName: 'Juan',
        lastName: 'Pérez'
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject requests without firstName', async () => {
      // Setup
      const req = mockRequest({}, {
        lastName: 'Pérez',
        email: 'juan@example.com'
      });
      const res = mockResponse();

      // Execute
      await customersService.createCustomer(req, res);

      // Verify
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('firstName')
      }));
    });
  });

  describe('updateCustomer', () => {
    it('should use the name utility to update the name field', async () => {
      // Setup
      (db.query.customers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Old Name',
        firstName: 'Old',
        lastName: 'Name',
        email: 'old@example.com'
      });

      const req = mockRequest(
        { id: '1' }, 
        {
          firstName: 'New',
          lastName: 'Name',
          email: 'new@example.com'
        }
      );
      const res = mockResponse();

      // Execute
      await customersService.updateCustomer(req, res);

      // Verify
      expect(db.update).toHaveBeenCalledWith(customers);
      expect(db.set).toHaveBeenCalledWith(expect.objectContaining({
        name: generateFullName('New', 'Name'),
        firstName: 'New',
        lastName: 'Name'
      }));
    });
  });

  describe('convertCustomerToLead', () => {
    it('should handle the name field correctly when converting', async () => {
      // Setup
      (db.query.customers.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Juan Pérez',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        phone: '1234567890'
      });

      const req = mockRequest({ id: '1' }, {});
      const res = mockResponse();

      // Execute
      await customersService.convertCustomerToLead(req, res);

      // Verify
      expect(db.insert).toHaveBeenCalledWith(leads);
      expect(db.values).toHaveBeenCalledWith(expect.objectContaining({
        name: generateFullName('Juan', 'Pérez'),
        firstName: 'Juan',
        lastName: 'Pérez'
      }));
    });
  });
});
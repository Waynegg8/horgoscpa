/**
 * Clients Routes
 */
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientServices,
  createClientService,
  updateClientService,
  toggleClientService,
  deleteClientService,
  getClientInteractions
} from '../handlers/clients.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerClientRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/clients', auth(getClients));
  router.get('/api/clients/:id', auth(getClient));
  router.post('/api/clients', admin(createClient));
  router.put('/api/clients/:id', admin(updateClient));
  router.delete('/api/clients/:id', admin(deleteClient));
  
  router.get('/api/client-services', auth(getClientServices));
  router.post('/api/client-services', admin(createClientService));
  router.put('/api/client-services/:id', admin(updateClientService));
  router.post('/api/client-services/:id/toggle', admin(toggleClientService));
  router.delete('/api/client-services/:id', admin(deleteClientService));

  router.get('/api/client-interactions', auth(getClientInteractions));
}

export default registerClientRoutes;

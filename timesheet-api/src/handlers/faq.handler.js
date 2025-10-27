/**
 * FAQ Handler
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getFaqCategories(env, request) {
  const repo = new BaseRepository(env.DB, TABLES.FAQ_CATEGORIES);
  const categories = await repo.findAll({}, { orderBy: 'sort_order', order: 'ASC' });
  return list(categories);
}

export async function getFaqs(env, request) {
  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  
  const repo = new BaseRepository(env.DB, TABLES.FAQS);
  const filters = categoryId ? { category_id: parseInt(categoryId) } : {};
  const faqs = await repo.findAll(filters, { orderBy: 'sort_order', order: 'ASC' });
  
  return list(faqs);
}

export async function createFaq(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.FAQS);
  
  data.created_by_user_id = request.user.id;
  if (!data.status) data.status = 'active';
  
  const id = await repo.create(data);
  const faq = await repo.findById(id);
  
  return created(faq);
}

export default {
  getFaqCategories,
  getFaqs,
  createFaq
};


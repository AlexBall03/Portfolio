'use server';

import { updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache-tags';
import { runMutation } from '@/lib/cms/mutation';
import { requireAdmin } from '@/server/auth/admin';
import {
  deleteProjectInput,
  projectEditorInput,
  projectMediaInput,
  projectMilestonesInput,
  projectOrderInput,
  projectRelationsInput,
  projectRepositoriesInput,
  projectSectionsInput,
} from './schema';
import * as service from './service';

/**
 * Project editor Server Actions. Each one authorizes first (the action ID is
 * callable from any page), then validates, writes, and refreshes the public
 * project reads (snapshot metrics derived from projects share the tag).
 * Media uploads are Route Handlers (`app/api/admin/projects/[id]/media`).
 */

export async function createProject(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectEditorInput, input, async (data) => {
    const saved = await service.createProject({ ...data, id: null }, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function saveProject(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectEditorInput, input, async (data) => {
    const saved = await service.saveProject(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function deleteProject(input: unknown) {
  await requireAdmin();
  return runMutation(deleteProjectInput, input, async (data) => {
    const deleted = await service.deleteProject(data);
    updateTag(CACHE_TAGS.projects);
    return deleted;
  });
}

export async function saveProjectOrder(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectOrderInput, input, async (data) => {
    const saved = await service.saveProjectOrder(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function saveProjectMedia(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectMediaInput, input, async (data) => {
    const saved = await service.saveProjectMedia(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function saveProjectSections(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectSectionsInput, input, async (data) => {
    const saved = await service.saveProjectSections(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function saveProjectMilestones(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectMilestonesInput, input, async (data) => {
    const saved = await service.saveProjectMilestones(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function saveProjectRelations(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectRelationsInput, input, async (data) => {
    const saved = await service.saveProjectRelations(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

export async function saveProjectRepositories(input: unknown) {
  const admin = await requireAdmin();
  return runMutation(projectRepositoriesInput, input, async (data) => {
    const saved = await service.saveProjectRepositories(data, admin);
    updateTag(CACHE_TAGS.projects);
    return saved;
  });
}

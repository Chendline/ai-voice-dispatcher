import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCookiesPath,
  isPrivacyPath,
  isTermsPath,
  isWorkspacePath,
  pathForSection,
  sectionFromPath,
} from '../src/lib/router.ts';

test('router: detects workspace paths correctly', () => {
  assert.equal(isWorkspacePath('/app'), true);
  assert.equal(isWorkspacePath('/app/'), true);
  assert.equal(isWorkspacePath('/app/voice'), true);
  assert.equal(isWorkspacePath('/app/dispatch'), true);
  assert.equal(isWorkspacePath('/'), false);
  assert.equal(isWorkspacePath('/terms'), false);
});

test('router: detects legal and policy paths correctly', () => {
  assert.equal(isTermsPath('/terms'), true);
  assert.equal(isTermsPath('/terms/'), true);
  assert.equal(isTermsPath('/terms/extra'), false);

  assert.equal(isPrivacyPath('/privacy'), true);
  assert.equal(isPrivacyPath('/privacy/'), true);
  assert.equal(isPrivacyPath('/privacy/extra'), false);

  assert.equal(isCookiesPath('/cookies'), true);
  assert.equal(isCookiesPath('/cookies/'), true);
  assert.equal(isCookiesPath('/cookies/extra'), false);
  assert.equal(isCookiesPath('/other'), false);
});

test('router: maps sections to and from paths', () => {
  assert.equal(sectionFromPath('/app'), 'chat');
  assert.equal(sectionFromPath('/app/chat'), 'chat');
  assert.equal(sectionFromPath('/app/voice'), 'voice');
  assert.equal(sectionFromPath('/app/dispatch'), 'dispatch');
  assert.equal(sectionFromPath('/app/agents'), 'agents');
  assert.equal(sectionFromPath('/app/settings'), 'settings');

  assert.equal(pathForSection('chat'), '/app');
  assert.equal(pathForSection('voice'), '/app/voice');
  assert.equal(pathForSection('dispatch'), '/app/dispatch');
  assert.equal(pathForSection('agents'), '/app/agents');
  assert.equal(pathForSection('settings'), '/app/settings');
});

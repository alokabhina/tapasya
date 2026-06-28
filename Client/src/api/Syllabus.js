// src/api/Syllabus.js — all Syllabus API calls

const BASE = '/api/syllabus';
const H = () => ({ 'Content-Type': 'application/json' });
const handle = async (res) => { const d = await res.json(); if (!res.ok) throw new Error(d?.error || 'Request failed'); return d; };
const cred = { credentials: 'include' };

// Exams
export const fetchExams  = ()       => fetch(BASE, cred).then(handle);
export const createExam  = (b)      => fetch(BASE, { method:'POST', headers:H(), ...cred, body:JSON.stringify(b) }).then(handle);
export const deleteExam  = (id)     => fetch(`${BASE}/${id}`, { method:'DELETE', ...cred }).then(handle);
export const patchExam   = (id, b)  => fetch(`${BASE}/${id}`, { method:'PATCH', headers:H(), ...cred, body:JSON.stringify(b) }).then(handle);

// Subjects
export const addSubject    = (eid, b)       => fetch(`${BASE}/${eid}/subjects`, { method:'POST', headers:H(), ...cred, body:JSON.stringify(b) }).then(handle);
export const patchSubject  = (eid, sid, b)  => fetch(`${BASE}/${eid}/subjects/${sid}`, { method:'PATCH', headers:H(), ...cred, body:JSON.stringify(b) }).then(handle);
export const deleteSubject = (eid, sid)     => fetch(`${BASE}/${eid}/subjects/${sid}`, { method:'DELETE', ...cred }).then(handle);

// Topics
export const addTopic    = (eid, sid, b)        => fetch(`${BASE}/${eid}/subjects/${sid}/topics`, { method:'POST', headers:H(), ...cred, body:JSON.stringify(b) }).then(handle);
export const patchTopic  = (eid, sid, tid, b)   => fetch(`${BASE}/${eid}/subjects/${sid}/topics/${tid}`, { method:'PATCH', headers:H(), ...cred, body:JSON.stringify(b) }).then(handle);
export const deleteTopic = (eid, sid, tid)      => fetch(`${BASE}/${eid}/subjects/${sid}/topics/${tid}`, { method:'DELETE', ...cred }).then(handle);

// Bulk (PDF import)
export const bulkSetSubjects = (eid, subjects) => fetch(`${BASE}/${eid}/bulk`, { method:'POST', headers:H(), ...cred, body:JSON.stringify({ subjects }) }).then(handle);
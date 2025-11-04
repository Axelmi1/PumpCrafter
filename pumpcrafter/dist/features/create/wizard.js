"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAwaitName = setAwaitName;
exports.consumeAwaitName = consumeAwaitName;
exports.setDraftName = setDraftName;
exports.getDraft = getDraft;
const sessions = new Map(); // temporary memory for Week 1 MVP
function setAwaitName(userId) {
    sessions.set(userId, { awaiting: "TOKEN_NAME", draft: {} });
}
function consumeAwaitName(userId) {
    const s = sessions.get(userId);
    return s?.awaiting === "TOKEN_NAME";
}
function setDraftName(userId, name) {
    const s = sessions.get(userId) || { draft: {} };
    delete s.awaiting;
    s.draft = { ...s.draft, name };
    sessions.set(userId, s);
}
function getDraft(userId) {
    return sessions.get(userId)?.draft;
}

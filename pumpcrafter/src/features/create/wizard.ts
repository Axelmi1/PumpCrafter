type Session = {
    awaiting?: "TOKEN_NAME";
    draft?: { name?: string };
  };
  
  const sessions = new Map<number, Session>(); // temporary memory for Week 1 MVP
  
  export function setAwaitName(userId: number) {
    sessions.set(userId, { awaiting: "TOKEN_NAME", draft: {} });
  }
  
  export function consumeAwaitName(userId: number) {
    const s = sessions.get(userId);
    return s?.awaiting === "TOKEN_NAME";
  }
  
  export function setDraftName(userId: number, name: string) {
    const s = sessions.get(userId) || { draft: {} };
    delete s.awaiting;
    s.draft = { ...s.draft, name };
    sessions.set(userId, s);
  }
  
  export function getDraft(userId: number) {
    return sessions.get(userId)?.draft;
  }
  
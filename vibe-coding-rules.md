# coding rules — nerdeala vibeathon

## organization
- keep it dry  
- utility functions for validation/formatting  
- shared components  
- split files >400 lines  
- group by feature  
- consistent names  

## security
- validate inputs client+server  
- parameterized queries  
- sanitize before render (xss)  
- auth middleware for sensitive routes  
- role-based access  
- rate limit login  
- secure headers (csp, cors)  
- https everywhere  
- secrets in env, never in code  

## error handling
- try/catch async  
- contextual logs  
- friendly ui messages  
- loading states  
- handle network failures  

## performance
- cache expensive ops  
- memoization  
- pagination for lists  
- clean up listeners/subs  
- avoid unnecessary renders  
- code splitting + lazy load  

## database
- transactions for related writes  
- rollback on fail  
- indexes on key fields  
- query only needed fields  
- connection pools  
- retry transient failures  

## api
- restful with correct verbs  
- consistent responses + codes  
- versioned endpoints  
- documented with examples  
- structured error objects  

## maintainability
- clear names  
- doc complex functions (why not just what)  
- tests: unit, integration, e2e  

## frontend
- live form validation  
- state management chosen per complexity  
- accessibility: semantic html, aria, contrast  
- keyboard navigation  

## vulnerabilities to prevent
- sql/nosql injection → parameterized queries  
- xss → sanitize  
- csrf → anti-csrf tokens  
- broken auth → session management, hashing

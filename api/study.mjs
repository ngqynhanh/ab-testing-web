import {handleRequest} from '../lib/vercel.mjs';
// Native Request/Response handler supported by Vercel's Node.js runtime.
export default {fetch:request=>handleRequest(request)};

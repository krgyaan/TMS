import{r}from"./main-CXf9gvvn.js";function s(e,t=300){const[o,u]=r.useState(e);return r.useEffect(()=>{const c=setTimeout(()=>{u(e)},t);return()=>{clearTimeout(c)}},[e,t]),o}export{s as u};

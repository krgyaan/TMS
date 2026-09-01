import{c,j as s,am as i,an as a,B as o,ao as t,ap as d,k as u}from"./main-CXf9gvvn.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]],p=c("ellipsis-vertical",x),m=({rowData:r,actions:l})=>s.jsxs(i,{children:[s.jsx(a,{asChild:!0,children:s.jsxs(o,{variant:"outline",size:"icon",className:"h-6 w-6 rounded-full",children:[s.jsx(p,{className:"h-4 w-4"}),s.jsx("span",{className:"sr-only",children:"Open row actions"})]})}),s.jsx(t,{align:"end",sideOffset:4,className:"w-40 cursor-pointer",children:l.filter(e=>e.visible?e.visible(r):!0).map((e,n)=>s.jsxs(d,{className:u("flex items-center gap-2 cursor-pointer",e.className),onClick:()=>e.onClick(r),disabled:e.visible?!e.visible(r):!1,children:[e.icon?s.jsx("span",{className:"text-muted-foreground",children:e.icon}):null,e.label]},`${e.label}-${n}`))})]});function j(r){return l=>s.jsx(m,{rowData:l.data,actions:r})}export{j as c};

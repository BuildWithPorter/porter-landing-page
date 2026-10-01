// A 12-second loop, retaining the complete problem / action / result story.
const campaignRender = window.render;
const end = T.end - .4;
window.renderWebsite = function(seconds) {
 const phase=seconds/12;
 const t=.5+phase*(end-.5);
 campaignRender(t);
 const envelope=Math.min(1,phase*24,(1-phase)*24);
 document.getElementById('stage').style.opacity=Math.max(0,envelope);
};

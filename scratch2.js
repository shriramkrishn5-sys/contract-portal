const Template = require('./models/Template');
(async () => {
  const templates = await Template.findAll();
  const videoTemplate = templates.find(t => t.name.includes('Video'));
  console.log(JSON.stringify(videoTemplate, null, 2));
})();

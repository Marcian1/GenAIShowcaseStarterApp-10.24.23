// Page expressions cannot follow associations, so the snippets read the names copied onto the Config by SUB_Config_RefreshStatus.
const fs = require('fs');
const M = 'AWSBedrockImplementation';
const file = process.argv[2];
let t = fs.readFileSync(file, 'utf8');
const rules = [
  [`$Config/${M}.Config_EmbeddingModel/ModelId + ' · ' + toString($Config/${M}.Config_EmbeddingModel/Dimension)`, `$Config/EmbeddingModelKey + ' · ' + toString($Config/EmbeddingDimension)`],
  [`$Config/${M}.Config_EmbeddingModel/Name + ' · ' + toString($Config/${M}.Config_EmbeddingModel/Dimension)`, `$Config/EmbeddingModelName + ' · ' + toString($Config/EmbeddingDimension)`],
  [`$Config/ChunksModelId != $Config/${M}.Config_EmbeddingModel/ModelId`, `$Config/ChunksModelId != $Config/EmbeddingModelKey`],
  [`$Config/${M}.Config_DatabaseConfiguration/DisplayName`, `$Config/DatabaseName`],
  [`$Config/${M}.Config_DatabaseConfiguration = empty`, `$Config/DatabaseName = ''`],
  [`$Config/${M}.Config_ChatModel/ModelId`, `$Config/ChatModelKey`],
  [`$Config/${M}.Config_ChatModel/Name`, `$Config/ChatModelName`],
  [`$Config/${M}.Config_EmbeddingModel/Name`, `$Config/EmbeddingModelName`],
  [`$currentObject != $Config/${M}.Config_DatabaseConfiguration`, `$currentObject/DisplayName != $Config/DatabaseName`],
  [`$currentObject = $Config/${M}.Config_DatabaseConfiguration`, `$currentObject/DisplayName = $Config/DatabaseName`],
  [`$currentObject = $Config/${M}.Config_ChatModel`, `$currentObject/ModelId = $Config/ChatModelKey`],
  [`$currentObject = $Config/${M}.Config_EmbeddingModel`, `$currentObject/ModelId = $Config/EmbeddingModelKey`],
];
for (const [from, to] of rules) t = t.split(from).join(to);
fs.writeFileSync(file, t);
const left = t.match(/\$[A-Za-z]+\/AWSBedrockImplementation\.Config_[A-Za-z]+\//g);
console.log('association paths left:', left ? left.length : 0);

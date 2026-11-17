// Text template parameters must be strings: wrap numbers in toString and replace formatDecimal by round.
const fs = require('fs');
for (const file of process.argv.slice(2)) {
  let t = fs.readFileSync(file, 'utf8');
  t = t.replace(/formatDecimal\(([^,()]+), (\d)\)/g, 'toString(round($1, $2))');
  t = t.replace(/(\{\d\} = )(\$Config\/(?:ChunkCount|StaleTicketCount|EmbeddingDimension|ReadyCount|TicketCount))(?=[,)])/g, '$1toString($2)');
  t = t.replace(/(\{\d\} = )(\$currentObject\/(?:SourceCount|Number|InputTokens|OutputTokens|Dimension))(?=[,)])/g, '$1toString($2)');
  fs.writeFileSync(file, t);
}

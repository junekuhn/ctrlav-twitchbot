
const easymidi = require('easymidi');

console.log('MIDI inputs:');
console.log(easymidi.getInputs());

console.log('MIDI outputs:');
console.log(easymidi.getOutputs());


const output = new easymidi.Output("Protokol 2");

output.send('noteon', {
  note: 64,
  velocity: 127,
  channel: 1
});

output.send('cc', {
  controller: 64,
  value: 127,
  channel: 1
});

output.send('poly aftertouch', {
  note: 64,
  pressure: 127,
  channel: 1
});

output.send('channel aftertouch', {
  pressure: 127,
  channel: 1
});

output.send('program', {
  number: 2,
  channel: 1
});

output.send('pitch', {
  value: 12345,
  channel: 0
});

output.send('position', {
  value: 12345
});

output.send('select', {
  song: 10
});

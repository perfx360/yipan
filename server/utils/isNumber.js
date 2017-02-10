/**
 * Created by Administrator on 2015/9/23.
 */

var outputDiskSize = function(diskSize){
    var unit = diskSize.match(/[B|K|M|G|T|b|k|m|g|t]/);
    if(!unit) return 0;
    unit = unit[0];
    var diskSizeFormatted = diskSize.replace(/[B|K|M|G|T|b|k|m|g|t]/,'');
    if(unit.toLowerCase() == 'k')
        diskSizeFormatted *= 1024;
    else if(unit.toLowerCase() == 'm')
        diskSizeFormatted *= 1024*1024;
    else if(unit.toLowerCase() == 'g')
        diskSizeFormatted *= 1024*1024*1024;
    else if(unit.toLowerCase() == 't')
        diskSizeFormatted *= 1024*1024*1024*1024;
    return diskSizeFormatted;
};

var numbers = ['11B','10K','2T','699M','0G'];
var notNumbers = ['11233','10K232','20.0T','aa6929M','G0'];
var reg = /^\d+[B|K|M|G|T|b|k|m|g|t]\b/;

console.log('numbers:');
for(var i=0; i<numbers.length; i++) {
    console.log(numbers[i], ' = ', outputDiskSize(numbers[i]));
    if (numbers[i].match(reg))
        console.log('\tTrue', numbers[i]);
    else
        console.log('\tFalse', numbers[i]);
}

console.log('Not numbers:');
for(var i=0; i<notNumbers.length; i++) {
    if (notNumbers[i].match(reg))
        console.log('\tTrue', notNumbers[i]);
    else
        console.log('\tFalse', notNumbers[i]);
}


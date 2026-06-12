import { cleanObject } from './src/lib/utils';
console.log(JSON.stringify(cleanObject({ 
  fixedCosts: [ 
    { id: '1', item: 'A', value: 10 }, 
    { id: '2', item: 'B', value: null, c: undefined }
  ] 
}), null, 2));

// Archive only this project, even when a parent folder is a Git repository.
const {spawnSync}=require('node:child_process');
const result=spawnSync('npx',['eas-cli@latest','build','--platform','android','--profile','preview',...process.argv.slice(2)],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,EAS_NO_VCS:'1',EAS_PROJECT_ROOT:require('node:path').resolve(__dirname,'..')},stdio:'inherit',shell:process.platform==='win32'});process.exit(result.status??1);

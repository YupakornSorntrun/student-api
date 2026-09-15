## มีคำสั่งที่ต้องเพิ่ม

### error 
```text
Error: Cannot find module './accept'
```

### วิธีแก้
```cmd
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
npm run dev
```

## ไลบารี่

npm install --save-dev jest supertest
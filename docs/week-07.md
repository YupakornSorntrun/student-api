# LAB 7

```cmd
docker exec -it redis-server redis-cli
```
### เมื่อเข้าสู่ prompt ของ redis-cli (127.0.0.1:6379>) ให้ทดลองคำสั่งต่อไปนี้

```text
KEYS *                 # แสดง key ทั้งหมด (ใช้ในงานทดสอบเท่านั้น ไม่ควรใช้บน production)
GET students:all       # ดูค่า (เป็นสตริง JSON ที่ serialize ไว้)
TTL students:all       # ดูเวลาที่เหลือก่อน key หมดอายุ (วินาที) ควรได้ค่า <= 60
TYPE students:all      # ดูชนิดข้อมูลของ key (ในที่นี้เป็น string)
DEL students:all       # ลบ key ทิ้งด้วยตนเอง เพื่อบังคับให้คำขอถัดไปเป็น cache miss
DBSIZE                 # จำนวน key ทั้งหมดในฐานข้อมูลปัจจุบัน
FLUSHALL               # ล้างข้อมูลทั้งหมด (ระวัง ใช้เฉพาะตอนทดสอบ)

```


## ทดสอบ

```text
D:\BackEnd\student-api>docker exec -it redis-server redis-cli
127.0.0.1:6379> KEYS * 
1) "students:all"
127.0.0.1:6379> GET students:all  
"[{\"id\":1,\"name\":\"\xe0\xb8\xaa\xe0\xb8\xa1\xe0\xb8\x8a\xe0\xb8\xb2\xe0\xb8\xa2 \xe0\xb9\x83\xe0\xb8\x88\xe0\xb8\x94\xe0\xb8\xb5\",\"major\":\"\xe0\xb8\xa7\xe0\xb8\xb4\xe0\xb8\x97\xe0\xb8\xa2\xe0\xb8\xb2\xe0\xb8\x81\xe0\xb8\xb2\xe0\xb8\xa3\xe0\xb8\x84\xe0\xb8\xad\xe0\xb8\xa1\xe0\xb8\x9e\xe0\xb8\xb4\xe0\xb8\xa7\xe0\xb9\x80\xe0\xb8\x95\xe0\xb8\xad\xe0\xb8\xa3\xe0\xb9\x8c\",\"email\":\"somchai_new@example.com\",\"created_at\":\"2026-08-28T07:01:51.000Z\",\"user_id\":1},{\"id\":2,\"name\":\"\xe0\xb8\xaa\xe0\xb8\xa1\xe0\xb8\xab\xe0\xb8\x8d\xe0\xb8\xb4\xe0\xb8\x87 \xe0\xb8\xa3\xe0\xb8\xb1\xe0\xb8\x81\xe0\xb9\x80\xe0\xb8\xa3\xe0\xb8\xb5\xe0\xb8\xa2\xe0\xb8\x99\",\"major\":\"\xe0\xb9\x80\xe0\xb8\x97\xe0\xb8\x84\xe0\xb9\x82\xe0\xb8\x99\xe0\xb9\x82\xe0\xb8\xa5\xe0\xb8\xa2\xe0\xb8\xb5\xe0\xb8\xaa\xe0\xb8\xb2\xe0\xb8\xa3\xe0\xb8\xaa\xe0\xb8\x99\xe0\xb9\x80\xe0\xb8\x97\xe0\xb8\xa8\",\"email\":\"somying@example.com\",\"created_at\":\"2026-08-28T07:01:51.000Z\",\"user_id\":null}]"
127.0.0.1:6379> TTL students:all  
(integer) 42
127.0.0.1:6379> TTL students:all  
(integer) 41
127.0.0.1:6379> TTL students:all  
(integer) 40
127.0.0.1:6379> TTL students:all  
(integer) 39
127.0.0.1:6379> TTL students:all  
(integer) 35
127.0.0.1:6379> TYPE students:all
none
127.0.0.1:6379> DEL students:all  
(integer) 0
127.0.0.1:6379> DBSIZE  
(integer) 0
127.0.0.1:6379> 
```


## ตารางบันทึกเวลาตอบสนองเปรียบเทียบระหว่าง cache hit และ cache miss

## จุดตรวจสอบที่ 2: Redis Caching

### 1. เชื่อมต่อ Redis สำเร็จ
[รูป Terminal ที่แสดง "เชื่อมต่อ Redis สำเร็จ"]

### 2. ทดสอบ Cache Hit / Cache Miss
[รูป Postman ครั้งแรก]
[รูป Postman ครั้งที่สอง]

### 3. ทดสอบการล้าง Cache หลัง POST
[รูป POST เพิ่มข้อมูล]
[รูป GET แล้วเห็นข้อมูลใหม่]

### 4. ตรวจสอบ Redis ด้วย redis-cli
[รูป KEYS]
[รูป TTL]
[รูป DEL หลัง POST]

### 5. ตารางเปรียบเทียบ Response Time
### 2.7 ตารางบันทึกเวลาตอบสนอง Cache Hit และ Cache Miss

ทำการทดสอบ `GET /api/v1/students` โดยเปรียบเทียบกรณีที่ไม่พบข้อมูลใน Redis (Cache Miss) และกรณีที่พบข้อมูลใน Redis (Cache Hit)

| ครั้งที่ | สถานะ Cache | แหล่งข้อมูล | Response Time (ms) | หมายเหตุ |
|---|---|---|---:|---|
| 1 | Cache Miss | MySQL | 22 | ไม่มี `students:all` ใน Redis |
| 2 | Cache Hit | Redis | 3 | พบ `students:all` ใน Redis |
| 3 | Cache Hit | Redis | XX | พบข้อมูลจาก Cache |
| 4 | Cache Miss | MySQL | XX | ลบ `students:all` แล้วเรียก API ใหม่ |

**ผลการทดสอบ:**  
Cache Hit มีเวลาตอบสนองเร็วกว่า Cache Miss เนื่องจากไม่ต้อง Query ข้อมูลจาก MySQL และสามารถดึงข้อมูลที่เก็บไว้ใน Redis ได้โดยตรง

![ทดสอบเรียกข้อมูลยังไม่มี cache](/images/wk07.1.png)

```text
127.0.0.1:6379> KEYS * 
(empty array)
```

![ทดสอบเรียกข้อมูลมี cache](/images/wk07.2.png)

```text
127.0.0.1:6379> KEYS * 
1) "students:all"
127.0.0.1:6379> GET students:all  
"[{\"id\":1,\"name\":\"\xe0\xb8\xaa\xe0\xb8\xa1\xe0\xb8\x8a\xe0\xb8\xb2\xe0\xb8\xa2 \xe0\xb9\x83\xe0\xb8\x88\xe0\xb8\x94\xe0\xb8\xb5\",\"major\":\"\xe0\xb8\xa7\xe0\xb8\xb4\xe0\xb8\x97\xe0\xb8\xa2\xe0\xb8\xb2\xe0\xb8\x81\xe0\xb8\xb2\xe0\xb8\xa3\xe0\xb8\x84\xe0\xb8\xad\xe0\xb8\xa1\xe0\xb8\x9e\xe0\xb8\xb4\xe0\xb8\xa7\xe0\xb9\x80\xe0\xb8\x95\xe0\xb8\xad\xe0\xb8\xa3\xe0\xb9\x8c\",\"email\":\"somchai_new@example.com\",\"created_at\":\"2026-08-28T07:01:51.000Z\",\"user_id\":1},{\"id\":2,\"name\":\"\xe0\xb8\xaa\xe0\xb8\xa1\xe0\xb8\xab\xe0\xb8\x8d\xe0\xb8\xb4\xe0\xb8\x87 \xe0\xb8\xa3\xe0\xb8\xb1\xe0\xb8\x81\xe0\xb9\x80\xe0\xb8\xa3\xe0\xb8\xb5\xe0\xb8\xa2\xe0\xb8\x99\",\"major\":\"\xe0\xb9\x80\xe0\xb8\x97\xe0\xb8\x84\xe0\xb9\x82\xe0\xb8\x99\xe0\xb9\x82\xe0\xb8\xa5\xe0\xb8\xa2\xe0\xb8\xb5\xe0\xb8\xaa\xe0\xb8\xb2\xe0\xb8\xa3\xe0\xb8\xaa\xe0\xb8\x99\xe0\xb9\x80\xe0\xb8\x97\xe0\xb8\xa8\",\"email\":\"somying@example.com\",\"created_at\":\"2026-08-28T07:01:51.000Z\",\"user_id\":null},{\"id\":3,\"name\":\"\xe0\xb8\xaa\xe0\xb8\xa1 \xe0\xb9\x84\xe0\xb8\x8a\",\"major\":\"\xe0\xb9\x80\xe0\xb8\x97\xe0\xb8\x84\xe0\xb9\x82\xe0\xb8\x99\xe0\xb9\x82\xe0\xb8\xa5\xe0\xb8\xa2\xe0\xb8\xb5\",\"email\":\"somchi@example.com\",\"created_at\":\"2026-09-02T18:54:51.000Z\",\"user_id\":null},{\"id\":4,\"name\":\"\xe0\xb8\xaa\xe0\xb8\xa1\",\"major\":\"\xe0\xb9\x80\xe0\xb8\x97\xe0\xb8\x84\xe0\xb9\x82\xe0\xb8\x99\xe0\xb9\x82\xe0\xb8\xa5\xe0\xb8\xa2\xe0\xb8\xb5\",\"email\":\"som@example.com\",\"created_at\":\"2026-09-02T22:36:51.000Z\",\"user_id\":null}]"
127.0.0.1:6379> TYPE students:all
string
127.0.0.1:6379> DBSIZE 
(integer) 1
127.0.0.1:6379> TTL students:all  
(integer) 18
127.0.0.1:6379> TTL students:all  
(integer) 17
```

![ทดสอบเพิ่มข้อมูล (มีการลบcacheเดิมออก)](/images/wk07.3.png)

```text
127.0.0.1:6379> TTL students:all  
(integer) 40
127.0.0.1:6379> KEYS * 
1) "students:all"
127.0.0.1:6379> TTL students:all  
(integer) 33
127.0.0.1:6379> KEYS * 
(empty array)
```


## แบบฝึกหัด 1-3

### แบบฝึกหัดที่ 1: เพิ่ม Cache ให้กับ Endpoint รายวิชา

Implement caching สำหรับ GET /api/v1/courses ในลักษณะเดียวกับ GET /api/v1/students ในขั้นตอนที่ 2.3 (ตรวจสอบแคชก่อน หากไม่พบให้ query ฐานข้อมูลแล้วเก็บผลลัพธ์ลงแคช) พร้อมกำหนด TTL ที่เหมาะสม (พิจารณาว่ารายวิชาเปลี่ยนแปลงไม่บ่อยเท่านิสิต จึงอาจตั้ง TTL ยาวกว่าได้) ใช้ message แยกแหล่งข้อมูลแบบเดียวกับขั้นตอนที่ 2.3 คือ "สำเร็จ (จาก cache)" และ "สำเร็จ (จากฐานข้อมูล)" เพื่อให้ตรวจสอบผลลัพธ์ได้ตรงตามเกณฑ์ด้านล่าง

```text
D:\BackEnd\student-api>docker exec -it redis-server redis-cli
127.0.0.1:6379> KEYS * 
1) "courses:all"
127.0.0.1:6379> TTL courses:all 
(integer) 59
127.0.0.1:6379> TTL courses:all 
(integer) 56
127.0.0.1:6379> 
```

### แบบฝึกหัดที่ 2: ออกแบบ Cache Key ที่รวมพารามิเตอร์การค้นหา

ปรับปรุง cache key ของ GET /api/v1/students ให้รวมค่าพารามิเตอร์ pagination, filtering และ sorting ทั้งหมด เช่น students:page=1:limit=10:major=CS:sort=name:order=asc เพื่อให้แต่ละชุดเงื่อนไขมีแคชของตัวเองแยกกัน ทดสอบว่าการค้นหาด้วยเงื่อนไขต่างกันไม่ได้ผลลัพธ์จากแคชของเงื่อนไขอื่นมาปะปน

```text
127.0.0.1:6379> KEYS * 
1) "students:page=2:limit=2:major=:sort=id:order=ASC"
2) "students:page=1:limit=2:major=:sort=id:order=ASC"
127.0.0.1:6379> 
```

### แบบฝึกหัดที่ 3: เพิ่ม Middleware ตรวจสอบ Header Deprecation

เพิ่ม middleware ให้กับ v1Router ที่แนบ Header Deprecation (ค่าเป็น Unix timestamp นำหน้าด้วย @ ตาม RFC 9745 เช่น @1735689600 ไม่ใช่ true) และ Link: </api/v2/students>; rel="successor-version" ในทุก response เพื่อแจ้งเตือน client ว่าเวอร์ชันนี้กำลังจะถูกเลิกใช้ในอนาคตและควรย้ายไปใช้ v2 แทน

### /api/v1
![v1](/images/wk07-ch-3(v1).png)

### /api/v2
![v2](/images/wk07-ch-3(v2).png)
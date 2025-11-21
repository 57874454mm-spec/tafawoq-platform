// Tafawoq full SPA — Firestore-based MVP (compat SDK)
const $ = id => document.getElementById(id);
const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('.nav-btn');
const deviceId = (localStorage.getItem('device_id') || ('dev-'+Math.random().toString(36).substr(2,8)));
localStorage.setItem('device_id', deviceId);

let currentUser = null; // {role:'admin'|'student', id, docId}

function showView(name){
  views.forEach(v => v.classList.add('hidden'));
  const el = $('view-'+name);
  if(el) el.classList.remove('hidden');
  window.scrollTo(0,0);
}

// nav
navButtons.forEach(b => b.addEventListener('click', ()=> showView(b.dataset.view)));

// load lists
async function loadHome(){
  const coursesSnap = await db.collection('Courses').orderBy('created_at','desc').limit(6).get();
  const homeCourses = $('home-courses'); homeCourses.innerHTML='';
  coursesSnap.forEach(doc => {
    const d=doc.data();
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = '<h4>'+d.course_name+'</h4><div class="small-muted">'+(d.course_price||0)+' جنيه</div><div style="margin-top:8px"><button onclick="openCourse(\''+doc.id+'\')">عرض الكورس</button></div>';
    homeCourses.appendChild(el);
  });
  const booksSnap = await db.collection('Books').orderBy('created_at','desc').limit(6).get();
  const homeBooks = $('home-books'); homeBooks.innerHTML='';
  booksSnap.forEach(doc=>{
    const d=doc.data();
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = '<h4>'+d.book_name+'</h4><div class="small-muted">'+(d.book_price||0)+' جنيه</div><div style="margin-top:8px"><button onclick="openBook(\''+doc.id+'\')">عرض الكتاب</button></div>';
    homeBooks.appendChild(el);
  });
}

async function loadCourses(){
  const snap = await db.collection('Courses').orderBy('created_at','desc').get();
  const list = $('courses-list'); list.innerHTML='';
  snap.forEach(doc=>{
    const d=doc.data();
    const el=document.createElement('div'); el.className='item';
    el.innerHTML = '<h4>'+d.course_name+'</h4><div class="small-muted">'+(d.course_price||0)+' جنيه</div><div style="margin-top:8px"><button onclick="openCourse(\''+doc.id+'\')">عرض</button> <button onclick="deleteDoc(\'Courses\', \''+doc.id+'\')" class="secondary">حذف</button></div>';
    list.appendChild(el);
  });
}

async function loadStore(){
  const snap = await db.collection('Books').orderBy('created_at','desc').get();
  const list = $('store-list'); list.innerHTML='';
  snap.forEach(doc=>{
    const d=doc.data();
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = '<h4>'+d.book_name+'</h4><div class="small-muted">'+(d.book_price||0)+' جنيه</div><div style="margin-top:8px"><button onclick="openBook(\''+doc.id+'\')">شراء</button></div>';
    list.appendChild(el);
  });
}

// open course view
window.openCourse = async (id) => {
  const doc = await db.collection('Courses').doc(id).get();
  if(!doc.exists) return alert('الكورس غير موجود');
  const d = doc.data();
  const detail = $('course-detail');
  detail.innerHTML = '<h3>'+d.course_name+'</h3><p class="small-muted">السعر: '+(d.course_price||0)+' جنيه</p><p>'+ (d.course_description||'') +'</p>';
  // lessons list
  const lessonsSnap = await db.collection('Lessons').where('course_id','==', id).orderBy('order','asc').get();
  let html = '<h4>الدروس</h4>';
  lessonsSnap.forEach(ld => {
    const L=ld.data();
    html += '<div class="item"><strong>'+L.lesson_title+'</strong><div class="small-muted">'+(L.content_type||'')+'</div><div style="margin-top:6px"><button onclick="openLesson(\''+ld.id+'\',\''+id+'\')">فتح الدرس</button></div></div>';
  });
  html += '<div style="margin-top:12px"><button onclick="startPurchase(\''+id+'\')">اشترِ الكورس</button></div>';
  detail.innerHTML += html;
  showView('course');
}

// open lesson
window.openLesson = async (lessonId, courseId) => {
  const doc = await db.collection('Lessons').doc(lessonId).get();
  if(!doc.exists) return alert('الدرس غير موجود');
  const L = doc.data();
  const container = $('lesson-detail');
  container.innerHTML = '<h3>'+L.lesson_title+'</h3><p>'+ (L.lesson_description||'') +'</p>';
  if(L.content_type === 'video' && L.video_url){
    container.innerHTML += '<div style="margin-top:10px"><iframe width="100%" height="360" src="'+L.video_url+'" frameborder="0" allowfullscreen></iframe></div>';
  } else if(L.content_type === 'pdf' && L.pdf_file){
    container.innerHTML += '<div style="margin-top:10px"><a href="'+L.pdf_file+'" target="_blank">فتح ملف PDF</a></div>';
  } else if(L.content_type === 'link' && L.external_links){
    container.innerHTML += '<div style="margin-top:10px"><a href="'+L.external_links+'" target="_blank">رابط الدرس</a></div>';
  } else {
    container.innerHTML += '<div class="small-muted">لا يوجد محتوى مرئي لهذا الدرس.</div>';
  }
  showView('lesson');
}

// open book
window.openBook = async (id) => {
  const doc = await db.collection('Books').doc(id).get();
  if(!doc.exists) return alert('الكتاب غير موجود');
  const d = doc.data();
  showModal('<h3>'+d.book_name+'</h3><p>السعر: '+(d.book_price||0)+' جنيه</p><p><button onclick="startPurchase(\''+id+'\', \'book\')">شراء الكتاب</button></p>');
}

// purchase flow
window.startPurchase = (itemId, type='course') => {
  if(!currentUser){ return showModal('<h3>لازم تسجل دخول أولا</h3><p><button onclick="openAuth()">'+'تسجيل / تسجيل دخول'+'</button></p>'); }
  const html = '<h3>دفع عبر Vodafone Cash</h3><p>ادفع المبلغ على رقم: <strong>01017365486</strong></p>'+
    '<div class="form-row"><label>أدخل رقم العملية (Transaction ID)</label><input id="tx-id"></div>'+
    '<div class="form-row"><label>ارفق إثبات الدفع (رابط أو URL للصورة)</label><input id="proof-url" placeholder="رابط الصورة"></div>'+
    '<div style="margin-top:8px"><button id="confirm-pay">إرسال إثبات للدفع</button></div>';
  showModal(html);
  document.getElementById('confirm-pay').onclick = async () => {
    const tx = document.getElementById('tx-id').value.trim();
    const proof = document.getElementById('proof-url').value.trim();
    if(!tx){ return alert('اكتب رقم العملية'); }
    await db.collection('Payments').add({
      student_id: currentUser.id,
      course_id_or_book_id: itemId,
      item_type: type,
      vodafone_number: '01017365486',
      transaction_number: tx,
      proof_image: proof || '',
      status: 'pending',
      created_at: new Date()
    });
    hideModal();
    alert('تم إرسال إثبات الدفع للأدمن للمراجعة');
  }
}

// modal helpers
function showModal(html){
  const area = $('forms-area'); area.innerHTML = '<div class="forms-modal"><div class="form-card">'+html+'<div style="text-align:left;margin-top:8px"><button onclick="hideModal()" class="secondary">إغلاق</button></div></div></div>';
}
function hideModal(){ $('forms-area').innerHTML=''; }

// Auth UI
function openAuth(){
  showView('profile');
  renderAuth();
}

async function renderAuth(){
  const area = $('auth-area'); area.innerHTML = '';
  if(!currentUser){
    area.innerHTML = '<h3>تسجيل الطالب</h3>'+
      '<div class="form-row"><label>رقم الطالب</label><input id="reg-id"></div>'+
      '<div class="form-row"><label>كلمة السر</label><input id="reg-pass" type="password"></div>'+
      '<div class="form-row"><label>رقم ولي الأمر</label><input id="reg-parent"></div>'+
      '<div class="form-row"><button id="reg-save">انشاء حساب</button></div>'+
      '<hr/><h3>أو تسجيل الدخول</h3>'+
      '<div class="form-row"><label>رقم الطالب أو الادمن</label><input id="login-id"></div>'+
      '<div class="form-row"><label>كلمة السر</label><input id="login-pass" type="password"></div>'+
      '<div class="form-row"><button id="login-do">تسجيل دخول</button></div>';
    document.getElementById('reg-save').onclick = async () => {
      const sid = document.getElementById('reg-id').value.trim();
      const spass = document.getElementById('reg-pass').value.trim();
      const parent = document.getElementById('reg-parent').value.trim();
      if(!sid || !spass){ return alert('اكتب رقم الطالب وكلمة السر'); }
      await db.collection('Students').add({ student_id: sid, password: spass, parent_phone: parent||'', student_name:'', status:'pending', created_at: new Date() });
      alert('تم إرسال طلب التسجيل، سيتم مراجعته يدوياً من الأدمن');
      renderAuth();
    }
    document.getElementById('login-do').onclick = async () => {
      const id = document.getElementById('login-id').value.trim();
      const pass = document.getElementById('login-pass').value.trim();
      if(!id||!pass) return alert('اكتب بيانات الدخول');
      // check admin
      const ad = await db.collection('Admin').where('admin_user','==', id).limit(1).get();
      if(!ad.empty){
        const adm = ad.docs[0].data();
        if(adm.admin_pass === pass){
          currentUser = {role:'admin', id:id, docId: ad.docs[0].id};
          localStorage.setItem('taf_user', JSON.stringify(currentUser));
          document.getElementById('nav-admin').style.display = 'inline-block';
          await createSession(id);
          renderAuth();
          return;
        }
      }
      const st = await db.collection('Students').where('student_id','==', id).limit(1).get();
      if(st.empty) return alert('المستخدم غير موجود');
      const sdoc = st.docs[0]; const sdata = sdoc.data();
      if(sdata.password !== pass) return alert('كلمة السر خاطئة');
      if(sdata.status !== 'approved' && sdata.status !== 'active') return alert('حسابك تحت المراجعة');
      currentUser = {role:'student', id:id, docId: sdoc.id};
      localStorage.setItem('taf_user', JSON.stringify(currentUser));
      await createSession(id);
      renderAuth();
    }
  } else {
    area.innerHTML = '<h3>مرحبًا، '+(currentUser.role==='admin' ? 'الأدمن' : currentUser.id)+'</h3>'+
      '<div class="form-row"><button id="logout-btn">تسجيل خروج</button></div>'+
      '<h4>الكورسات التي اشترتها</h4><div id="my-courses"></div>'+
      '<h4>الكتب المشتراة</h4><div id="my-books"></div>';
    document.getElementById('logout-btn').onclick = async ()=> { await logoutUser(); renderAuth(); }
    renderMyContent();
  }
}

async function renderMyContent(){
  const myCourses = $('my-courses'); myCourses.innerHTML='';
  const snap = await db.collection('Courses').where('students','array-contains', currentUser.id).get();
  snap.forEach(d => {
    const data = d.data();
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = '<strong>'+data.course_name+'</strong><div class="small-muted">السعر: '+(data.course_price||0)+'</div><div style="margin-top:6px"><button onclick="openCourse(\''+d.id+'\')">الدخول للكورس</button></div>';
    myCourses.appendChild(el);
  });
  const myBooks = $('my-books'); myBooks.innerHTML='';
  const bSnap = await db.collection('Books').where('buyers','array-contains', currentUser.id).get();
  bSnap.forEach(d => {
    const data = d.data();
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = '<strong>'+data.book_name+'</strong><div class="small-muted">سعر: '+(data.book_price||0)+'</div><div style="margin-top:6px"><a href="'+(data.book_pdf||'#')+'" target="_blank">تحميل</a></div>';
    myBooks.appendChild(el);
  });
}

// session management
async function createSession(userId){
  const sessionsRef = db.collection('Sessions');
  const q = await sessionsRef.where('student_id','==', userId).where('active','==', true).get();
  const batch = db.batch();
  q.forEach(d => batch.update(d.ref, { active: false }));
  await batch.commit();
  await sessionsRef.add({ student_id: userId, device_id: deviceId, login_time: new Date(), active: true });
}

async function logoutUser(){
  try{
    const q = await db.collection('Sessions').where('student_id','==', currentUser.id).where('device_id','==', deviceId).where('active','==', true).get();
    const batch = db.batch();
    q.forEach(d=> batch.update(d.ref, { active: false }) );
    await batch.commit();
  }catch(e){ console.error(e); }
  currentUser = null; localStorage.removeItem('taf_user'); document.getElementById('nav-admin').style.display='none';
}

// Admin area
async function renderAdminArea(){
  const area = $('admin-area'); area.innerHTML = '';
  // payments pending
  const paySnap = await db.collection('Payments').where('status','==','pending').get();
  let html = '<h4>المدفوعات المعلقة</h4>';
  paySnap.forEach(doc => {
    const d=doc.data();
    html += '<div class="item"><strong>طالب: '+d.student_id+'</strong><div>عن: '+(d.course_id_or_book_id||'')+'</div><div>رقم العملية: '+(d.transaction_number||'')+'</div>' +
      '<div style="margin-top:6px"><button onclick="adminVerify(\''+doc.id+'\')">تحقق</button> <button onclick="adminReject(\''+doc.id+'\')" class="secondary">رفض</button></div></div>';
  });
  html += '<hr/><h4>إضافة كورس سريع</h4><div class="form-row"><input id="a-course-name" placeholder="عنوان الكورس"></div><div class="form-row"><input id="a-course-price" placeholder="السعر"></div><div class="form-row"><button id="a-add-course">أضف كورس</button></div>';
  html += '<h4>إضافة كتاب سريع</h4><div class="form-row"><input id="a-book-name" placeholder="عنوان الكتاب"></div><div class="form-row"><input id="a-book-price" placeholder="السعر"></div><div class="form-row"><input id="a-book-pdf" placeholder="رابط PDF"></div><div class="form-row"><button id="a-add-book">أضف كتاب</button></div>';
  area.innerHTML = html;
  document.getElementById('a-add-course').onclick = async ()=> {
    const name = document.getElementById('a-course-name').value.trim(); const price = Number(document.getElementById('a-course-price').value) || 0;
    if(!name) return alert('اكتب اسم الكورس');
    await db.collection('Courses').add({ course_name: name, course_price: price, course_description:'', students:[], created_at: new Date() });
    alert('تم اضافة الكورس');
    renderAdminArea();
  }
  document.getElementById('a-add-book').onclick = async ()=> {
    const name = document.getElementById('a-book-name').value.trim(); const price = Number(document.getElementById('a-book-price').value) || 0; const pdf = document.getElementById('a-book-pdf').value.trim();
    if(!name) return alert('اكتب اسم الكتاب');
    await db.collection('Books').add({ book_name: name, book_price: price, book_pdf: pdf, buyers:[], created_at: new Date() });
    alert('تم اضافة الكتاب');
    renderAdminArea();
  }
}

window.adminVerify = async (docId) => {
  const docRef = db.collection('Payments').doc(docId);
  const data = (await docRef.get()).data();
  const itemId = data.course_id_or_book_id;
  if(data.item_type === 'book'){
    const bookRef = db.collection('Books').doc(itemId);
    const bdoc = await bookRef.get();
    if(bdoc.exists){
      const bdata = bdoc.data();
      const buyers = bdata.buyers || [];
      if(!buyers.includes(data.student_id)) buyers.push(data.student_id);
      await bookRef.update({ buyers });
    }
  } else {
    const courseRef = db.collection('Courses').doc(itemId);
    const cdoc = await courseRef.get();
    if(cdoc.exists){
      const cdata = cdoc.data();
      const students = cdata.students || [];
      if(!students.includes(data.student_id)) students.push(data.student_id);
      await courseRef.update({ students });
    }
  }
  await docRef.update({ status: 'verified', verified_at: new Date() });
  alert('تم التحقق وتفعيل الشراء');
  renderAdminArea();
}

window.adminReject = async (docId) => {
  await db.collection('Payments').doc(docId).update({ status: 'rejected' });
  alert('تم رفض الدفع');
  renderAdminArea();
}

function initNav(){
  document.getElementById('nav-admin').style.display = 'none';
  const u = localStorage.getItem('taf_user');
  if(u){
    currentUser = JSON.parse(u);
    if(currentUser.role==='admin') document.getElementById('nav-admin').style.display='inline-block';
  }
  loadHome(); loadCourses(); loadStore();
}

document.addEventListener('DOMContentLoaded', ()=> {
  initNav();
  navButtons[0].click();
  document.getElementById('nav-admin').addEventListener('click', ()=> renderAdminArea());
  document.getElementById('search-btn').addEventListener('click', async ()=>{
    const q = document.getElementById('search-input').value.trim();
    if(!q) return;
    const cSnap = await db.collection('Courses').where('course_name','>=', q).where('course_name','<=', q+'\uf8ff').get();
    const bSnap = await db.collection('Books').where('book_name','>=', q).where('book_name','<=', q+'\uf8ff').get();
    const homeCourses = $('home-courses'); homeCourses.innerHTML='';
    cSnap.forEach(doc => { const d=doc.data(); const el=document.createElement('div'); el.className='item'; el.innerHTML='<h4>'+d.course_name+'</h4><div class="small-muted">'+(d.course_price||0)+'</div><div style="margin-top:6px"><button onclick="openCourse(\''+doc.id+'\')">عرض</button></div>'; homeCourses.appendChild(el); });
    const homeBooks = $('home-books'); homeBooks.innerHTML='';
    bSnap.forEach(doc => { const d=doc.data(); const el=document.createElement('div'); el.className='item'; el.innerHTML='<h4>'+d.book_name+'</h4><div class="small-muted">'+(d.book_price||0)+'</div><div style="margin-top:6px"><button onclick="openBook(\''+doc.id+'\')">عرض</button></div>'; homeBooks.appendChild(el); });
  });
});

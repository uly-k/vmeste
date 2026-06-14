// Данные сотрудников
const teamMembers = [
  { name: "Анна Воробьёва", position: "руководительница", description: "отвечает за всё и рада каждому гостю", img: "media/team/tw1.jpg" },
  { name: "Дмитрий Козлов", position: "администратор", description: "встречает, регистрирует и отвечает на вопросы", img: "media/team/vanc.jpg" },
  { name: "Екатерина Новикова", position: "ивент-менеджерка", description: "придумывает лекции и мастер-классы", img: "media/team/tw2.jpg" },
  { name: "Иван Соколов", position: "технический специалист", description: "чинит розетки и следит за интернетом", img: "media/team/m2.jpg" },
  { name: "Мария Петрова", position: "бариста", description: "готовит кофе и всегда подскажет, что вкусного выпить", img: "media/team/tw3.jpg" },
  { name: "Ольга Сидорова", position: "куратор креативной зоны", description: "помогает с материалами и идеями для творчества", img: "media/team/tw5.jpg" },
  { name: "Алексей Морозов", position: "звукорежиссёр", description: "отвечает за звук в лектории на мероприятиях", img: "media/team/m1.png" },
  { name: "Светлана Ильина", position: "тифлокомментатор", description: "рассказывает о визуальной части событий для незрячих гостей", img: "media/team/tw4.jpg" },
  { name: "Павел Гришин", position: "уборщик", description: "самый незаметный и самый важный человек, который поддерживает чистоту", img: "media/team/m8.jpg" },
  { name: "Юлия Тарасова", position: "волонтёр-координатор", description: "помогает гостям и заботится о том, чтобы всем было комфортно", img: "media/team/tw6.png" },
  { name: "Глеб Андреев", position: "кладовщик", description: "хранитель склада. Знает, где что лежит. Видели его — передавайте привет", img: "media/team/m3.png" },
  { name: "Кристина Лебедева", position: "психолог", description: "можно прийти поговорить, если трудно или просто хочется выговориться", img: "media/team/tw7.jpg" }
];

const INITIAL_VISIBLE = 4;
let visibleCount = INITIAL_VISIBLE;

const teamContainer = document.getElementById('team-container');
const loadMoreBtn = document.getElementById('teamLoadMoreBtn');

function createTeamCard(member) {
  const article = document.createElement('article');
  article.className = 'team-card';  
  
  article.innerHTML = `
    <img src="${member.img}" alt="${member.name}">
    <div class="vn_cont">
      <div class="vn_text">   
        <h3>${member.name}</h3>
        <div class="dec">${member.position}</div>
      </div>
      <p>${member.description}</p>
    </div>
  `;
  
  return article;
}

function renderTeam() {
  if (!teamContainer) return;
  
  teamContainer.innerHTML = '';
  
  for (let i = 0; i < visibleCount && i < teamMembers.length; i++) {
    const card = createTeamCard(teamMembers[i]);
    teamContainer.appendChild(card);
  }
  
  if (loadMoreBtn) {
    loadMoreBtn.style.display = visibleCount >= teamMembers.length ? 'none' : 'inline-flex';
  }
  
  setTimeout(() => {
    const cards = document.querySelectorAll('.team-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('visible');
      }, index * 50);
    });
  }, 10);
}

function loadMore() {
  visibleCount = Math.min(visibleCount + 4, teamMembers.length);
  renderTeam();
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', loadMore);
}

renderTeam();
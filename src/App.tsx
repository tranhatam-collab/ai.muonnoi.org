export default function App() {
  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">ai.muonnoi.org</div>

        <nav>
          <a href="#">Trang chủ</a>
          <a href="#">Thảo luận</a>
          <a href="#">Cộng đồng</a>
          <a href="#">AI</a>
        </nav>

        <div className="auth">
          <button className="btn-login">Đăng nhập</button>
        </div>
      </header>

      <main className="hero">
        <h1>Mạng xã hội chia sẻ sự thật</h1>

        <p>
          Nơi cộng đồng thảo luận, kiểm chứng thông tin và chia sẻ tri thức
          cùng AI.
        </p>

        <div className="hero-buttons">
          <button className="btn-primary">Tham gia thảo luận</button>
          <button className="btn-secondary">Khám phá chủ đề</button>
        </div>
      </main>

      <section className="features">
        <div className="feature">
          <h3>Thảo luận mở</h3>
          <p>Mọi người có thể chia sẻ quan điểm và tranh luận minh bạch.</p>
        </div>

        <div className="feature">
          <h3>AI hỗ trợ</h3>
          <p>AI giúp phân tích thông tin, tóm tắt và kiểm chứng dữ kiện.</p>
        </div>

        <div className="feature">
          <h3>Cộng đồng minh bạch</h3>
          <p>Hệ thống chống spam và quản trị cộng đồng mở.</p>
        </div>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} ai.muonnoi.org</p>
      </footer>
    </div>
  )
}

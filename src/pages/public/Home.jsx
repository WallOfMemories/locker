import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="container hero__content">
          <p className="hero__eyebrow">A WALL FOR EVERY MEMORY</p>

          <h1>
            Your moment.
            <br />
            Your space.
            <br />
            <span>Forever on the wall.</span>
          </h1>

          <p className="hero__description">
            SnapWall is a growing digital wall where you can reserve a space,
            create a Snap, and share your moment with the world.
          </p>

          <div className="hero__actions">
            <Link to="/wall" className="hero__primary">
              Explore SnapWall
            </Link>

            <Link to="/profile" className="hero__secondary">
              My profile
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
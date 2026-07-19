import { Link } from "react-router-dom";

// Placeholder About page. The button is live and routes here; real copy will be
// handed off later and dropped into .rg-about-inner.
export default function About() {
  return (
    <div className="rg-about">
      <Link className="rg-back" to="/">← Back</Link>
      <div className="rg-about-scroll">
        <div className="rg-about-inner">
          <h1>About</h1>
          <p>Content coming soon.</p>
          <Link className="rg-pill" to="/">Back to home</Link>
        </div>
      </div>
    </div>
  );
}

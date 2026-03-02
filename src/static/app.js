document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list with participants section
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            <div class="participants-container"></div>
          </div>
        `;

        // Build participants list with delete buttons
        const participantsContainer = activityCard.querySelector('.participants-container');
        if (details.participants && details.participants.length) {
          const ul = document.createElement('ul');
          ul.className = 'participants-list';

          details.participants.forEach((p) => {
            const li = document.createElement('li');
            li.className = 'participant-item';

            const span = document.createElement('span');
            span.textContent = p;

            const btn = document.createElement('button');
            btn.className = 'participant-delete';
            btn.setAttribute('aria-label', `Remove ${p}`);
            btn.textContent = '✕';
            btn.addEventListener('click', async () => {
              try {
                const resp = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`, { method: 'DELETE' });
                const resJson = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = resJson.message;
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  fetchActivities();
                } else {
                  messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } catch (err) {
                console.error('Error removing participant:', err);
                messageDiv.textContent = 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              }
            });

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });

          participantsContainer.appendChild(ul);
        } else {
          const p = document.createElement('p');
          p.className = 'no-participants';
          p.textContent = 'No participants yet';
          participantsContainer.appendChild(p);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Immediately update the activity card in the DOM for snappy UX
        const normalized = email.trim().toLowerCase();
        const cards = document.querySelectorAll('.activity-card');
        let updated = false;
        cards.forEach(card => {
          const title = card.querySelector('h4');
          if (title && title.textContent === activity) {
            // update availability
            const availP = Array.from(card.querySelectorAll('p')).find(p => p.textContent.includes('Availability:'));
            if (availP) {
              // parse spots left and decrement
              const match = availP.textContent.match(/(\d+) spots left/);
              if (match) {
                const spots = Math.max(0, parseInt(match[1], 10) - 1);
                availP.innerHTML = `<strong>Availability:</strong> ${spots} spots left`;
              }
            }

            const container = card.querySelector('.participants-container');
            if (container) {
              // find or create ul
              let ul = container.querySelector('ul.participants-list');
              if (!ul) {
                ul = document.createElement('ul');
                ul.className = 'participants-list';
                container.innerHTML = '';
                container.appendChild(ul);
              }

              const li = document.createElement('li');
              li.className = 'participant-item';
              const span = document.createElement('span');
              span.textContent = normalized;
              const btn = document.createElement('button');
              btn.className = 'participant-delete';
              btn.setAttribute('aria-label', `Remove ${normalized}`);
              btn.textContent = '✕';
              btn.addEventListener('click', async () => {
                try {
                  const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(normalized)}`, { method: 'DELETE' });
                  const resJson = await resp.json();
                  if (resp.ok) {
                    messageDiv.textContent = resJson.message;
                    messageDiv.className = 'success';
                    messageDiv.classList.remove('hidden');
                    fetchActivities();
                  } else {
                    messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                    messageDiv.className = 'error';
                    messageDiv.classList.remove('hidden');
                  }
                  setTimeout(() => messageDiv.classList.add('hidden'), 4000);
                } catch (err) {
                  console.error('Error removing participant:', err);
                }
              });

              li.appendChild(span);
              li.appendChild(btn);
              ul.appendChild(li);
            }

            updated = true;
          }
        });

        // also refresh from server to ensure consistency
        if (!updated) fetchActivities(); else fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

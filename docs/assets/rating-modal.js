import { supabase } from './supabaseClient.js';

export function showRatingModal(shipmentId, ratedUserId, ratedUserType, ratedUserName) {
    const modal = document.createElement('div');
    modal.className = 'rating-modal-overlay';
    modal.innerHTML = `
        <div class="rating-modal">
            <div class="rating-modal-header">
                <h3>Rate ${ratedUserType === 'shipper' ? 'Shipper' : 'Driver'}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="rating-modal-body">
                <p class="rating-user-name">${ratedUserName}</p>
                <div class="star-rating">
                    <i class="fas fa-star" data-rating="1"></i>
                    <i class="fas fa-star" data-rating="2"></i>
                    <i class="fas fa-star" data-rating="3"></i>
                    <i class="fas fa-star" data-rating="4"></i>
                    <i class="fas fa-star" data-rating="5"></i>
                </div>
                <textarea id="reviewText" placeholder="Write your review (optional)" rows="4"></textarea>
                <button class="submit-rating-btn" id="submitRatingBtn">Submit Rating</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let selectedRating = 0;
    const stars = modal.querySelectorAll('.star-rating i');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
                s.style.color = i < selectedRating ? '#ffc107' : '#ddd';
            });
        });
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    modal.querySelector('#submitRatingBtn').addEventListener('click', async () => {
        if (selectedRating === 0) {
            alert('Please select a rating');
            return;
        }
        
        const review = modal.querySelector('#reviewText').value;
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase.from('ratings').insert({
            shipment_id: shipmentId,
            rater_id: user.id,
            rated_id: ratedUserId,
            rating: selectedRating,
            review: review || null,
            rater_type: user.user_metadata.user_role
        });
        
        if (error) {
            alert('Failed to submit rating: ' + error.message);
        } else {
            alert('Rating submitted successfully!');
            modal.remove();
            window.location.reload();
        }
    });
}

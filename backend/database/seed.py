
from pwdlib import PasswordHash

from database.database import init_db, get_connection

password_hash = PasswordHash.recommended()

DEMO_PASSWORD = "Demo123!"


def seed_database():
    # Create tables first if they do not exist.
    init_db()

    conn = get_connection()

    try:
        # ==================================================
        # 1. CREATE 15 DEMO RESIDENTS
        # ==================================================

        residents = [
            ("Alex Tan", "alex.demo@example.com", "0123456789", "Puchong"),
            ("Sarah Lim", "sarah.demo@example.com", "0123456788", "Subang Jaya"),
            ("Jason Lee", "jason.demo@example.com", "0123456787", "Puchong"),
            ("Mei Ling", "meiling.demo@example.com", "0123456786", "Sunway"),
            ("Daniel Wong", "daniel.demo@example.com", "0123456785", "Puchong"),
            ("Aisha Rahman", "aisha.demo@example.com", "0123456784", "Subang Jaya"),
            ("Ryan Tan", "ryan.demo@example.com", "0123456783", "Sunway"),
            ("Priya Kumar", "priya.demo@example.com", "0123456782", "Puchong"),
            ("Ethan Chong", "ethan.demo@example.com", "0123456781", "Subang Jaya"),
            ("Nurul Huda", "nurul.demo@example.com", "0123456790", "Sunway"),
            ("Chloe Ng", "chloe.demo@example.com", "0123456791", "Puchong"),
            ("Adam Lim", "adam.demo@example.com", "0123456792", "Subang Jaya"),
            ("Sofia Ahmad", "sofia.demo@example.com", "0123456793", "Sunway"),
            ("Lucas Goh", "lucas.demo@example.com", "0123456794", "Puchong"),
            ("Emma Teoh", "emma.demo@example.com", "0123456795", "Subang Jaya"),
        ]

        member_ids = {}

        for name, email, phone, address in residents:
            existing = conn.execute(
                """
                SELECT member_id
                FROM resident_member
                WHERE email = ?
                """,
                (email,),
            ).fetchone()

            if existing:
                member_id = existing["member_id"]
            else:
                hashed_password = password_hash.hash(DEMO_PASSWORD)

                cursor = conn.execute(
                    """
                    INSERT INTO resident_member
                    (full_name, email, phone, address, password_hash)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (name, email, phone, address, hashed_password),
                )
                member_id = cursor.lastrowid

            member_ids[email] = member_id

        # Helper to retrieve a demo member ID.
        def member(email):
            return member_ids[email]

        # ==================================================
        # 2. CREATE POSTS
        # 5 Community + 5 Help + 3 Events
        # ==================================================

        posts = [
            # Community posts
            {
                "email": "alex.demo@example.com",
                "title": "Welcome to NeighbourHub!",
                "content": (
                    "Welcome everyone! Let's use this space to connect, "
                    "share useful information and build a friendlier "
                    "neighbourhood together."
                ),
                "category": "Community",
            },
            {
                "email": "sarah.demo@example.com",
                "title": "Best food spots around Puchong?",
                "content": (
                    "I'm looking for affordable local food recommendations. "
                    "Please share your favourite places!"
                ),
                "category": "Community",
            },
            {
                "email": "jason.demo@example.com",
                "title": "Neighbourhood recycling tips",
                "content": (
                    "How do you separate recyclables at home? "
                    "Let's share some practical tips."
                ),
                "category": "Community",
            },
            {
                "email": "meiling.demo@example.com",
                "title": "Water disruption update",
                "content": (
                    "Has anyone received an official update about the "
                    "planned water disruption? Please share verified "
                    "information if available."
                ),
                "category": "Community",
            },
            {
                "email": "daniel.demo@example.com",
                "title": "Let's welcome our new neighbours",
                "content": (
                    "It would be nice to organise a small welcome "
                    "gathering and help new residents get to know everyone."
                ),
                "category": "Community",
            },

            # Help posts
            {
                "email": "aisha.demo@example.com",
                "title": "Need help carrying a table",
                "content": (
                    "Could someone help me carry a table upstairs "
                    "this Saturday afternoon?"
                ),
                "category": "Help",
            },
            {
                "email": "ryan.demo@example.com",
                "title": "Can someone lend me a screwdriver?",
                "content": (
                    "I need a screwdriver for a small home repair. "
                    "I can return it the same day."
                ),
                "category": "Help",
            },
            {
                "email": "priya.demo@example.com",
                "title": "Looking for plant-watering help",
                "content": (
                    "I'll be away for two days. Is anyone able to "
                    "water a few plants for me?"
                ),
                "category": "Help",
            },
            {
                "email": "ethan.demo@example.com",
                "title": "Offering free maths tutoring",
                "content": (
                    "I can help neighbourhood school students with "
                    "basic maths on weekends."
                ),
                "category": "Help",
            },
            {
                "email": "nurul.demo@example.com",
                "title": "Need help finding a lost cat",
                "content": (
                    "My neighbour's orange cat has gone missing nearby. "
                    "Please let us know if you spot it."
                ),
                "category": "Help",
            },

            # Events
            {
                "email": "alex.demo@example.com",
                "title": "Community Gotong-Royong",
                "content": (
                    "Join us to clean shared spaces, collect litter "
                    "and make our neighbourhood greener."
                ),
                "category": "Events",
                "event_date": "2026-11-08",
            },
            {
                "email": "sarah.demo@example.com",
                "title": "Neighbourhood Open House",
                "content": (
                    "Meet your neighbours, share some food and "
                    "enjoy a friendly community gathering."
                ),
                "category": "Events",
                "event_date": "2026-11-15",
            },
            {
                "email": "jason.demo@example.com",
                "title": "Recycling and Upcycling Workshop",
                "content": (
                    "Learn simple ways to reuse household items "
                    "and reduce waste."
                ),
                "category": "Events",
                "event_date": "2026-11-22",
            },
        ]

        post_ids = {}

        for post in posts:
            member_id = member(post["email"])
            event_date = post.get("event_date")

            existing = conn.execute(
                """
                SELECT post_id
                FROM post_content
                WHERE member_id = ?
                  AND title = ?
                  AND category = ?
                """,
                (member_id, post["title"], post["category"]),
            ).fetchone()

            if existing:
                post_id = existing["post_id"]

                # Keep seeded event dates correct if the event
                # already exists from an earlier version of the script.
                if post["category"] == "Events":
                    conn.execute(
                        """
                        UPDATE post_content
                        SET event_date = ?
                        WHERE post_id = ?
                        """,
                        (event_date, post_id),
                    )
            else:
                cursor = conn.execute(
                    """
                    INSERT INTO post_content
                    (member_id, title, content, category, event_date)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        member_id,
                        post["title"],
                        post["content"],
                        post["category"],
                        event_date,
                    ),
                )
                post_id = cursor.lastrowid

            post_ids[post["title"]] = post_id

        # ==================================================
        # 3. ADD AT LEAST 5 REPLIES TO EACH COMMUNITY POST
        # ==================================================

        community_replies = {
            "Welcome to NeighbourHub!": [
                "Great idea! Looking forward to connecting with everyone.",
                "Thanks for creating a space for our neighbourhood.",
                "I hope we can organise more community activities here.",
                "Happy to be part of this community!",
                "This will be useful for sharing local information.",
            ],
            "Best food spots around Puchong?": [
                "There are several affordable eateries near the main market.",
                "I usually look for local kopitiams for breakfast.",
                "The food court nearby has a good variety of choices.",
                "Thanks for asking! I'd love some new recommendations too.",
                "Let's make a list of everyone's favourite food spots.",
            ],
            "Neighbourhood recycling tips": [
                "I separate paper, plastic and metal before recycling.",
                "Remember to rinse containers before putting them aside.",
                "We should check which materials our local collection accepts.",
                "Reusable bags also help reduce household waste.",
                "A shared recycling point would be really helpful.",
            ],
            "Water disruption update": [
                "Let's make sure we check official announcements first.",
                "It may be useful to prepare some drinking water in advance.",
                "Please share the official notice if you find one.",
                "We should avoid forwarding unverified information.",
                "A reliable update here would help many residents.",
            ],
            "Let's welcome our new neighbours": [
                "A small weekend gathering sounds lovely.",
                "We could have a simple bring-and-share meal.",
                "I'd be happy to help prepare the welcome area.",
                "Let's choose a time that works for most residents.",
                "This is a great way for everyone to get acquainted.",
            ],
        }

        demo_emails = list(member_ids.keys())

        for title, replies in community_replies.items():
            post_id = post_ids[title]

            # Five different demo residents reply to each post.
            for index, reply_text in enumerate(replies):
                email = demo_emails[index]
                reply_member_id = member(email)

                exists = conn.execute(
                    """
                    SELECT 1
                    FROM post_reply
                    WHERE post_id = ?
                      AND member_id = ?
                      AND content = ?
                    """,
                    (post_id, reply_member_id, reply_text),
                ).fetchone()

                if not exists:
                    conn.execute(
                        """
                        INSERT INTO post_reply
                        (post_id, member_id, content)
                        VALUES (?, ?, ?)
                        """,
                        (post_id, reply_member_id, reply_text),
                    )

        # ==================================================
        # 4. CREATE 10 MARKETPLACE PRODUCTS
        # ==================================================

        
        products = [
            (member_ids["alex.demo@example.com"], "Board Game", 20.00, "Games", "Good", "Puchong", "A fun board game for family nights.", "/static/images/product_image/boardGame.jpg"),
            (member_ids["sarah.demo@example.com"], "Desk Lamp", 15.00, "Home", "Good", "Subang Jaya", "A working desk lamp looking for a new owner.", "/static/images/product_image/deskLamp.jpg"),
            (member_ids["jason.demo@example.com"], "Indoor Plant", 12.00, "Plants", "Good", "Puchong", "A lovely indoor plant for your home.", "/static/images/product_image/indoorPlant.avif"),
            (member_ids["meiling.demo@example.com"], "Keyboard", 25.00, "Electronics", "Good", "Sunway", "A keyboard in good working condition.", "/static/images/product_image/keyboard.jpg"),
            (member_ids["daniel.demo@example.com"], "Potted Herbs", 10.00, "Plants", "Good", "Puchong", "Fresh herbs growing in a pot.", "/static/images/product_image/pottedHerbs.jpg"),
            (member_ids["aisha.demo@example.com"], "Storage Boxes", 8.00, "Home", "Good", "Subang Jaya", "Storage boxes for organising your home.", "/static/images/product_image/storageBoxes.jpg"),
            (member_ids["ryan.demo@example.com"], "Storybook", 5.00, "Books", "Good", "Puchong", "A second-hand storybook ready for a new reader.", "/static/images/product_image/storybook.jpg"),
            (member_ids["priya.demo@example.com"], "Study Chair", 35.00, "Furniture", "Good", "Sunway", "A chair suitable for studying at home.", "/static/images/product_image/studyChair.jpg"),
            (member_ids["ethan.demo@example.com"], "Used Bags", 18.00, "Accessories", "Good", "Puchong", "Pre-loved bags looking for a new owner.", "/static/images/product_image/usedbags.jpg"),
            (member_ids["nurul.demo@example.com"], "Water Bottle", 6.00, "Accessories", "Good", "Subang Jaya", "A reusable water bottle.", "/static/images/product_image/waterBottle.jpg"),
        ]

        
        for product in products:
            member_id, name, price, category, condition, location, description, image = product

            exists = conn.execute(
                """
                SELECT 1 FROM marketplace_product
                WHERE member_id = ? AND name = ?
                """,
                (member_id, name),
            ).fetchone()

            if exists:
                conn.execute(
                    """
                    UPDATE marketplace_product
                    SET image = ?
                    WHERE member_id = ? AND name = ?
                    """,
                    (image, member_id, name),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO marketplace_product
                    (member_id, name, price, category, condition, location, description, image)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        member_id,
                        name,
                        price,
                        category,
                        condition,
                        location,
                        description,
                        image,
                    ),
                )


        # ==================================================
        # 5. REGISTER AT LEAST 5 MEMBERS FOR EACH EVENT
        # ==================================================

        event_titles = [
            "Community Gotong-Royong",
            "Neighbourhood Open House",
            "Recycling and Upcycling Workshop",
        ]

        for title in event_titles:
            post_id = post_ids[title]

            # Five demo attendees per event, each bringing one person.
            # Each attendee is stored as one registration with
            # attendee_count = 1.
            for email in demo_emails[:5]:
                attendee_id = member(email)

                exists = conn.execute(
                    """
                    SELECT 1
                    FROM event_registration
                    WHERE post_id = ? AND member_id = ?
                    """,
                    (post_id, attendee_id),
                ).fetchone()

                if not exists:
                    conn.execute(
                        """
                        INSERT INTO event_registration
                        (post_id, member_id, attendee_count)
                        VALUES (?, ?, 1)
                        """,
                        (post_id, attendee_id),
                    )

        conn.commit()

        # ==================================================
        # 6. PRINT A SUMMARY
        # ==================================================

        counts = {
            "Demo residents": conn.execute(
                """
                SELECT COUNT(*) FROM resident_member
                WHERE email LIKE '%@example.com'
                  AND email LIKE '%.demo@example.com'
                """
            ).fetchone()[0],

            "Community posts": conn.execute(
                """
                SELECT COUNT(*) FROM post_content
                WHERE category = ?
                AND title IN (?, ?, ?, ?, ?)
                """,
                (
                    "Community",
                    "Welcome to NeighbourHub!",
                    "Best food spots around Puchong?",
                    "Neighbourhood recycling tips",
                    "Water disruption update",
                    "Let's welcome our new neighbours",
                )
            ).fetchone()[0],

            "Help posts": conn.execute(
                """
                SELECT COUNT(*) FROM post_content
                WHERE category = 'Help'
                  AND title IN (
                      'Need help carrying a table',
                      'Can someone lend me a screwdriver?',
                      'Looking for plant-watering help',
                      'Offering free maths tutoring',
                      'Need help finding a lost cat'
                  )
                """
            ).fetchone()[0],

            "Events": conn.execute(
                """
                SELECT COUNT(*) FROM post_content
                WHERE category = 'Events'
                  AND title IN (
                      'Community Gotong-Royong',
                      'Neighbourhood Open House',
                      'Recycling and Upcycling Workshop'
                  )
                """
            ).fetchone()[0],

            "Marketplace products": conn.execute(
                """
                SELECT COUNT(*) FROM marketplace_product
                WHERE name IN (
                    'Used storybooks', 'Desk lamp', 'Indoor plant',
                    'Study chair', 'Water bottle', 'Storage boxes',
                    'Board game', 'Potted herbs', 'Keyboard',
                    'Reusable shopping bags'
                )
                """
            ).fetchone()[0],
        }

        print("\n===== NeighbourHub Demo Data =====")
        for label, count in counts.items():
            print(f"{label}: {count}")

        print("\nCommunity post reply counts:")
        for title in community_replies:
            reply_count = conn.execute(
                """
                SELECT COUNT(*)
                FROM post_reply
                WHERE post_id = ?
                """,
                (post_ids[title],),
            ).fetchone()[0]

            print(f"- {title}: {reply_count} replies")

        print("\nEvent registration counts:")
        for title in event_titles:
            registration_count = conn.execute(
                """
                SELECT COALESCE(SUM(attendee_count), 0)
                FROM event_registration
                WHERE post_id = ?
                """,
                (post_ids[title],),
            ).fetchone()[0]

            print(f"- {title}: {registration_count} participants")

        print("\nSample data is ready!")

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()


if __name__ == "__main__":
    seed_database()

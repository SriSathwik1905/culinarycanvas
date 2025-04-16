import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Custom Auth Function Starting")

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  console.log("Request received:", req.method, req.url)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, username, email, password, identifier, first_name, last_name } = await req.json()
    console.log("Action:", action)

    if (action === 'login') {
      console.log("Processing login request")
      let query = supabase.from('users').select('id, username, email, password_hash, first_name, last_name')
      
      if (identifier) {
        // Check if identifier is an email or username
        if (identifier.includes('@')) {
          console.log("Login with email:", identifier)
          query = query.eq('email', identifier)
        } else {
          console.log("Login with username:", identifier)
          query = query.eq('username', identifier)
        }
      } else if (email) {
        console.log("Login with email:", email)
        query = query.eq('email', email)
      } else if (username) {
        console.log("Login with username:", username)
        query = query.eq('username', username)
      } else {
        console.log("No identifier provided")
        return new Response(
          JSON.stringify({ message: 'Username or email is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      const { data: user, error: userError } = await query.single()

      if (userError || !user) {
        console.error('Login error:', userError)
        return new Response(
          JSON.stringify({ message: 'Invalid username/email or password' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const passwordHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password)
      )
      const hashedPassword = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      if (hashedPassword !== user.password_hash) {
        console.log("Password doesn't match")
        return new Response(
          JSON.stringify({ message: 'Invalid username/email or password' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      console.log("Login successful")
      return new Response(
        JSON.stringify({ 
          user: { 
            id: user.id, 
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'register') {
      console.log("Processing registration request")
      if (!username || !email || !password) {
        return new Response(
          JSON.stringify({ message: 'Username, email, and password are required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if username exists
      const { data: existingUsername, error: usernameError } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single()

      if (usernameError && usernameError.code !== 'PGRST116') {
        console.error("Database error checking username:", usernameError)
        return new Response(
          JSON.stringify({ message: 'Database error checking username' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (existingUsername) {
        return new Response(
          JSON.stringify({ message: 'Username already taken' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Check if email exists
      const { data: existingEmail, error: emailError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single()

      if (emailError && emailError.code !== 'PGRST116') {
        console.error("Database error checking email:", emailError)
        return new Response(
          JSON.stringify({ message: 'Database error checking email' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (existingEmail) {
        return new Response(
          JSON.stringify({ message: 'Email already registered' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const passwordHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(password)
      )
      const hashedPassword = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ 
          username,
          email,
          password_hash: hashedPassword,
          first_name,
          last_name
        }])
        .select('id, username, email, first_name, last_name')
        .single()

      if (insertError) {
        console.error('Registration error:', insertError)
        return new Response(
          JSON.stringify({ message: 'Failed to create user: ' + insertError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log("Registration successful")
      return new Response(
        JSON.stringify({ user: newUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ message: 'Server error: ' + (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
